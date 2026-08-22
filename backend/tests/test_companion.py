from app.services.characters import get_character, list_characters
from app.services.companion_intents import detect_period_mention, parse_task_update_from_reply
from app.services.companion_memory import build_summary
from app.services.risk_triage import RiskTier, classify_risk
from app.services.voice_tone_analysis import blend_vocal_into_risk, score_voice_features
from app.store import store
from app.services import pipeline


def test_characters_span_gender_and_nationality():
    rows = list_characters()
    assert len(rows) >= 6
    assert {c["gender"] for c in rows} >= {"female", "male"}
    assert {"Indian", "American", "British", "Japanese"} <= {c["nationality"] for c in rows}
    assert get_character("nope")["id"] == "aisha"


def test_period_detect_and_task_parse():
    assert detect_period_mention("I got my period today") == "start"
    assert detect_period_mention("my period ended") == "end"
    assert detect_period_mention("hello there") is None
    assert parse_task_update_from_reply("yeah I did it") == "done"
    assert parse_task_update_from_reply("I finished half of it") == "partial"
    assert parse_task_update_from_reply("not yet") == "open"


def test_vocal_never_downgrades_keyword_red():
    red = classify_risk("I want to kill myself")
    assert red.tier == RiskTier.RED
    vocal = score_voice_features({"pitch_variance": 8, "speech_rate": 1.1, "pause_ratio": 0.5})
    blended = blend_vocal_into_risk(red, vocal)
    assert blended.tier == RiskTier.RED
    assert "vocal" in blended.sources


def test_vocal_can_escalate_green():
    green = classify_risk("I want to start meditating after work")
    assert green.tier == RiskTier.GREEN
    vocal = score_voice_features({"pitch_variance": 70, "speech_rate": 4.2, "pause_ratio": 0.04})
    blended = blend_vocal_into_risk(green, vocal)
    assert blended.tier in {RiskTier.YELLOW, RiskTier.RED}
    assert "vocal" in blended.sources


def test_summary_has_no_raw_user_quote():
    raw = "I told you my secret password is hunter2 and I cried about JEE"
    summary = build_summary(
        session={"last_problem": "academic", "peak_tier": "yellow", "turn_count": 2},
        history=[{"role": "user", "text": raw}],
        actions=[],
    )
    assert "hunter2" not in summary
    assert "exam stress" in summary or "academic" in summary
    assert "transcript" in summary.lower()


import pytest


@pytest.mark.asyncio
async def test_companion_period_and_task_tools():
    await store.connect()
    from app.services.seed import seed_if_needed

    await seed_if_needed()
    user = await store.collection("users").find_one({"id": "usr_demo"})
    await store.collection("habits").update_one(
        {"id": "hab_gate_mock", "user_id": user["id"]},
        {"$set": {"log": []}},
    )
    session = await pipeline.ensure_session(
        user_id=user["id"],
        guest=False,
        channel="chat",
        consent=True,
    )
    period = await pipeline.handle_turn(
        session=session,
        text="I got my period today",
        language_pref="en",
        user=user,
        character_id="aisha",
    )
    assert period["llm_used"] is True
    assert any(a["tool"] == "log_period_entry" and a["ok"] for a in period["actions"])
    cycle = await store.collection("cycles").find_one({"user_id": user["id"]})
    assert cycle and cycle.get("days")

    task = await pipeline.handle_turn(
        session=session,
        text="yeah I did it, finished the GATE mock",
        language_pref="en",
        user=user,
        character_id="aisha",
    )
    assert any(a["tool"] == "update_task" and a["ok"] for a in task["actions"])
    habit = await store.collection("habits").find_one({"id": "hab_gate_mock", "user_id": user["id"]})
    assert any(row.get("done") for row in (habit.get("log") or []))
