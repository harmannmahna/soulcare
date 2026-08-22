import pytest

from app.services import avatar_turn
from app.services.risk_triage import RiskTier
from app.store import store


class ForbiddenTalk:
    async def __call__(self, *args, **kwargs):
        raise AssertionError("D-ID must not run on red-tier avatar turns")


@pytest.mark.asyncio
async def test_avatar_red_skips_did_and_llm(monkeypatch):
    await store.connect()

    async def fake_hume(*_a, **_k):
        return {"ok": True, "transcript": "I want to kill myself", "vocal_score": 0.1}

    async def boom(*_a, **_k):
        raise AssertionError("LLM must not run on red avatar turns")

    monkeypatch.setattr(avatar_turn, "analyze_audio", fake_hume)
    monkeypatch.setattr(avatar_turn, "create_talk", ForbiddenTalk())
    monkeypatch.setattr(avatar_turn, "get_ai_provider", lambda: type("P", (), {"generate": boom})())

    result = await avatar_turn.run_avatar_turn(
        user={"id": "usr_av_test", "guest": False, "consent": True, "language": "en"},
        audio=b"fake-bytes",
        filename="t.webm",
        content_type="audio/webm",
        session_id=None,
    )
    assert result["llm_used"] is False
    assert result["video_url"] is None
    assert result["risk"]["tier"] == RiskTier.RED.value
    assert "112" in result["reply"]
    stored = await store.collection("risk_events").find({"session_id": result["session_id"]})
    assert stored
    assert "kill myself" not in str(stored[-1])


@pytest.mark.asyncio
async def test_avatar_green_requests_did(monkeypatch):
    await store.connect()

    async def fake_hume(*_a, **_k):
        return {"ok": True, "transcript": "I want to start meditating after work", "vocal_score": 0.1}

    class Friendly:
        async def generate(self, *args, **kwargs):
            return "A short sit after work can be enough."

    async def fake_talk(text):
        assert "sit" in text.lower() or text
        return {"ok": True, "video_url": "https://example.com/talk.mp4"}

    monkeypatch.setattr(avatar_turn, "analyze_audio", fake_hume)
    monkeypatch.setattr(avatar_turn, "get_ai_provider", lambda: Friendly())
    monkeypatch.setattr(avatar_turn, "create_talk", fake_talk)

    result = await avatar_turn.run_avatar_turn(
        user={"id": "usr_av_ok", "guest": False, "consent": True, "language": "en"},
        audio=b"fake-bytes",
        filename="t.webm",
        content_type="audio/webm",
        session_id=None,
    )
    assert result["llm_used"] is True
    assert result["video_url"] == "https://example.com/talk.mp4"
    assert result["risk"]["tier"] == "green"
