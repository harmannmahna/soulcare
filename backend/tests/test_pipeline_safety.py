import pytest

from app.services import pipeline
from app.services.risk_triage import RiskTier
from app.store import store


class ForbiddenAI:
    async def generate(self, *args, **kwargs):
        raise AssertionError("LLM must not be called on red-tier turns")


@pytest.mark.asyncio
async def test_red_turn_skips_llm_and_logs_metadata_only(monkeypatch):
    await store.connect()
    session = await pipeline.ensure_session(
        user_id="usr_test",
        guest=True,
        channel="chat",
        consent=True,
    )
    monkeypatch.setattr(pipeline, "get_ai_provider", lambda: ForbiddenAI())

    result = await pipeline.handle_turn(
        session=session,
        text="I want to kill myself",
        language_pref="en",
    )
    assert result["llm_used"] is False
    assert result["risk"]["tier"] == RiskTier.RED.value
    assert "112" in result["reply"]
    assert "14416" in result["reply"]

    events = await store.collection("risk_events").find({"session_id": session["id"]})
    assert events
    stored = events[-1]
    assert "kill myself" not in str(stored)
    assert stored["tier"] == "red"
    assert stored["triggered_rule"] == "crisis_self_harm"
    assert stored["action"] == "emergency_escalation"


@pytest.mark.asyncio
async def test_yellow_returns_specialist_match(monkeypatch):
    await store.connect()
    from app.services.seed import seed_if_needed

    await seed_if_needed()

    class FriendlyAI:
        async def generate(self, *args, **kwargs):
            return "I hear the exam weight. Let's take this one hour at a time."

    monkeypatch.setattr(pipeline, "get_ai_provider", lambda: FriendlyAI())
    session = await pipeline.ensure_session(
        user_id="usr_test_y",
        guest=True,
        channel="chat",
        consent=True,
    )
    result = await pipeline.handle_turn(
        session=session,
        text="JEE exam stress is crushing me",
        language_pref="en",
    )
    assert result["llm_used"] is True
    assert result["risk"]["tier"] == "yellow"
    assert result["therapists"]
    tags = {tag for t in result["therapists"] for tag in t.get("tags", [])}
    assert tags.intersection({"student", "academic", "stress", "anxiety"})
