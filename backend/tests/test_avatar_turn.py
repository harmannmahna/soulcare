import pytest

from app.services import avatar_turn
from app.services.risk_triage import ProblemType, RiskResult, RiskTier, classify_risk
from app.store import store


@pytest.mark.asyncio
async def test_avatar_red_skips_llm_and_does_not_speak(monkeypatch):
    await store.connect()

    async def fake_hume(*_a, **_k):
        return {"ok": True, "transcript": "I want to kill myself", "vocal_score": 0.1}

    async def boom(*_a, **_k):
        raise AssertionError("LLM must not run on red avatar turns")

    monkeypatch.setattr(avatar_turn, "analyze_audio", fake_hume)
    monkeypatch.setattr(avatar_turn, "get_ai_provider", lambda: type("P", (), {"generate": boom})())

    result = await avatar_turn.run_avatar_turn(
        user={"id": "usr_av_test", "guest": False, "consent": True, "language": "en"},
        audio=b"fake-bytes",
        filename="t.webm",
        content_type="audio/webm",
        session_id=None,
    )
    assert result["llm_used"] is False
    assert result["speak"] is False
    assert result.get("video_url") in (None, "")
    assert result["risk"]["tier"] == RiskTier.RED.value
    assert "112" in result["reply"]
    stored = await store.collection("risk_events").find({"session_id": result["session_id"]})
    assert stored
    assert "kill myself" not in str(stored[-1])


@pytest.mark.asyncio
async def test_avatar_green_returns_spoken_reply_without_video(monkeypatch):
    await store.connect()

    async def fake_hume(*_a, **_k):
        return {
            "ok": True,
            "transcript": "I want to start meditating after work",
            "vocal_score": 0.1,
            "emotions": [{"name": "Calmness", "score": 0.4}],
        }

    class Friendly:
        async def generate(self, *args, **kwargs):
            assert kwargs.get("hinglish") is False
            assert kwargs.get("spoken") is True
            assert "Voice-call situation" in (kwargs.get("extra_context") or "")
            assert "meditat" in (kwargs.get("extra_context") or "").lower() or "habit" in (
                kwargs.get("extra_context") or ""
            ).lower() or "They said" in (kwargs.get("extra_context") or "")
            return "A short sit after work can be enough."

    monkeypatch.setattr(avatar_turn, "analyze_audio", fake_hume)
    monkeypatch.setattr(avatar_turn, "get_ai_provider", lambda: Friendly())

    result = await avatar_turn.run_avatar_turn(
        user={"id": "usr_av_ok", "guest": False, "consent": True, "language": "en"},
        audio=b"fake-bytes",
        filename="t.webm",
        content_type="audio/webm",
        session_id=None,
    )
    assert result["llm_used"] is True
    assert result["speak"] is True
    assert result.get("video_url") in (None, "")
    assert "sit" in result["reply"].lower()
    assert result["transcript"] == "I want to start meditating after work"
    assert result["risk"]["tier"] == "green"


@pytest.mark.asyncio
async def test_avatar_passes_exam_situation_and_hinglish(monkeypatch):
    await store.connect()

    async def fake_hume(*_a, **_k):
        return {
            "ok": True,
            "transcript": "Exam ki tension bahut hai yaar, padhai nahi ho rahi",
            "vocal_score": 0.52,
            "emotions": [
                {"name": "Anxiety", "score": 0.61},
                {"name": "Distress", "score": 0.48},
            ],
        }

    captured = {}

    class Capture:
        async def generate(self, user_text, **kwargs):
            captured["text"] = user_text
            captured.update(kwargs)
            return "Exam wala pressure asl hai — agla chhota tukda kaun sa hai?"

    monkeypatch.setattr(avatar_turn, "analyze_audio", fake_hume)
    monkeypatch.setattr(avatar_turn, "get_ai_provider", lambda: Capture())

    result = await avatar_turn.run_avatar_turn(
        user={"id": "usr_av_hi", "guest": False, "consent": True, "language": "hinglish"},
        audio=b"fake-bytes",
        filename="t.webm",
        content_type="audio/webm",
        session_id=None,
    )
    assert result["llm_used"] is True
    assert result["speak"] is True
    assert captured.get("spoken") is True
    assert captured.get("hinglish") is True
    ctx = captured.get("extra_context") or ""
    assert "Voice-call situation" in ctx
    assert "exam" in ctx.lower() or "academic" in ctx.lower() or "study" in ctx.lower()
    assert "Anxiety" in ctx or "Distress" in ctx
    assert "0.52" in ctx or "vocal distress" in ctx.lower()


def test_build_voice_situation_context_flags_tone_gap():
    effective = RiskResult(
        tier=RiskTier.GREEN,
        problem_type=ProblemType.GENERAL,
        triggered_rule=None,
        matched_phrase=None,
        action="companion",
        tags=["anxiety"],
    )
    ctx = avatar_turn.build_voice_situation_context(
        transcript="I am fine honestly",
        effective=effective,
        vocal_score=0.55,
        vocal_tier=RiskTier.YELLOW,
        emotions=[{"name": "Anxiety", "score": 0.7}, {"name": "Distress", "score": 0.5}],
    )
    assert "composed" in ctx.lower() or "gap" in ctx.lower() or "distress" in ctx.lower()
    assert "Anxiety" in ctx
    assert "I am fine" in ctx


@pytest.mark.asyncio
async def test_mock_spoken_exam_reply_uses_situation():
    from app.services.ai import MockAI

    risk = classify_risk("JEE ke liye tension hai, padhai nahi ho rahi")
    ctx = avatar_turn.build_voice_situation_context(
        transcript="JEE ke liye tension hai, padhai nahi ho rahi",
        effective=risk,
        vocal_score=0.45,
        vocal_tier=RiskTier.YELLOW,
        emotions=[{"name": "Anxiety", "score": 0.6}],
    )
    reply = await MockAI().generate(
        "JEE ke liye tension hai, padhai nahi ho rahi",
        yellow=True,
        hinglish=True,
        history=[],
        extra_context=ctx,
        spoken=True,
    )
    assert "exam" in reply.lower() or "syllabus" in reply.lower() or "tukda" in reply.lower()
    assert "#" not in reply and "*" not in reply
