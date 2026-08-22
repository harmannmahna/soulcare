"""Chat / voice turn pipeline.

Order is intentional and must stay this way:
1. Classify risk on the server (isolated function).
2. Persist only metadata (never raw message text).
3. If RED: return the fixed safety script, broadcast admin alert, do not call an LLM.
4. Otherwise generate a companion reply (Gemini or MockAI) and optionally match therapists.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app.services.alerts import hub
from app.services.ai import get_ai_provider
from app.services.ngo_notify import notify_red, safety_copy
from app.services.risk_triage import RiskTier, classify_risk, public_risk_payload
from app.services.therapist_matching import rank_therapists
from app.store import store

# In-process only — used for short conversational context, not long-term storage.
_SESSION_MEMORY: dict[str, list[dict]] = {}


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def wants_hinglish(text: str, language_pref: str | None) -> bool:
    if (language_pref or "").lower() in {"hinglish", "hi", "hindi"}:
        return True
    markers = ("hai", "nahi", "nahin", "yaar", "bahut", "kya", "acha", "accha", "mann", "saans")
    lowered = (text or "").lower()
    return sum(1 for m in markers if m in lowered) >= 2


async def match_therapists(tags: list[str], limit: int = 3, query: str = "") -> list[dict]:
    return await rank_therapists(query=query, tags=tags, limit=limit)


async def ensure_session(
    *,
    user_id: str,
    guest: bool,
    channel: str,
    consent: bool,
    session_id: str | None = None,
) -> dict:
    sessions = store.collection("sessions")
    if session_id:
        existing = await sessions.find_one({"id": session_id})
        if existing:
            return existing
    doc = {
        "id": session_id or _new_id("ses"),
        "user_id": user_id,
        "guest": guest,
        "channel": channel,
        "started_at": _now(),
        "last_tier": "green",
        "last_action": None,
        "turn_count": 0,
        "active": True,
        "taken_over": False,
        "peak_tier": "green",
        "summary": "New session",
        "last_companion_preview": None,
    }
    await sessions.insert_one(doc)
    return doc


async def handle_turn(
    *,
    session: dict,
    text: str,
    language_pref: str | None,
) -> dict:
    result = classify_risk(text)
    event = {
        "id": _new_id("ev"),
        "session_id": session["id"],
        "user_id": session.get("user_id"),
        "tier": result.tier.value,
        "triggered_rule": result.triggered_rule,
        "action": result.action,
        "problem_type": result.problem_type.value,
        "model_label": result.model_label,
        "model_confidence": result.model_confidence,
        "model_probs": result.model_probs,
        "sources": result.sources,
        "created_at": _now(),
    }
    public = public_risk_payload(result)
    history = _SESSION_MEMORY.setdefault(session["id"], [])

    if result.tier == RiskTier.RED:
        ngo = await notify_red(
            session_id=session["id"],
            user_id=session.get("user_id"),
            event_id=event["id"],
            triggered_rule=result.triggered_rule,
        )
        event["notifiedChannel"] = ngo["notifiedChannel"]
        event["notifiedAt"] = ngo["notifiedAt"]
        event["ngo_name"] = ngo["ngo_name"]
        await store.collection("risk_events").insert_one(event)
        await store.collection("sessions").update_one(
            {"id": session["id"]},
            {
                "$set": {
                    "last_tier": "red",
                    "last_action": result.action,
                    "last_event_at": event["created_at"],
                    "peak_tier": "red",
                    "summary": "Crisis language. LLM skipped. Partner NGO notified.",
                },
                "$inc": {"turn_count": 1},
            },
        )
        await hub.broadcast(
            {
                "type": "red_alert",
                "session_id": session["id"],
                "user_id": session.get("user_id"),
                "tier": "red",
                "triggered_rule": result.triggered_rule,
                "action": result.action,
                "created_at": event["created_at"],
                "model_confidence": result.model_confidence,
                "notifiedChannel": ngo["notifiedChannel"],
                "notifiedAt": ngo["notifiedAt"],
                "ngo_name": ngo["ngo_name"],
            }
        )
        reply = safety_copy(ngo["ngo_name"])
        public["safety_message"] = reply
        public["notifiedChannel"] = ngo["notifiedChannel"]
        public["notifiedAt"] = ngo["notifiedAt"]
        public["ngo_name"] = ngo["ngo_name"]
        return {
            "session_id": session["id"],
            "risk": public,
            "reply": reply,
            "llm_used": False,
            "therapists": [],
            "event_id": event["id"],
        }

    await store.collection("risk_events").insert_one(event)
    peak = session.get("peak_tier") or "green"
    order = {"green": 0, "yellow": 1, "red": 2}
    if order.get(result.tier.value, 0) > order.get(peak, 0):
        peak = result.tier.value
    await store.collection("sessions").update_one(
        {"id": session["id"]},
        {
            "$set": {
                "last_tier": result.tier.value,
                "last_action": result.action,
                "last_event_at": event["created_at"],
                "peak_tier": peak,
                "summary": f"{result.tier.value} · {result.problem_type.value}",
            },
            "$inc": {"turn_count": 1},
        },
    )

    hinglish = wants_hinglish(text, language_pref)
    provider = get_ai_provider()
    reply = await provider.generate(
        text,
        yellow=result.tier == RiskTier.YELLOW,
        hinglish=hinglish,
        history=history,
    )
    history.append({"role": "user", "text": text[:500]})
    history.append({"role": "assistant", "text": reply[:800]})
    if len(history) > 12:
        del history[:-12]

    therapists = []
    if result.tier == RiskTier.YELLOW:
        therapists = await match_therapists(result.tags, query=text)
        public["checkin_after"] = True
    await store.collection("sessions").update_one(
        {"id": session["id"]},
        {
            "$set": {
                "last_companion_preview": reply[:240],
                "last_problem": result.problem_type.value,
            }
        },
    )

    return {
        "session_id": session["id"],
        "risk": public,
        "reply": reply,
        "llm_used": True,
        "therapists": therapists,
        "event_id": event["id"],
    }


async def transfer_sessions(from_user: str, to_user: str) -> int:
    moved = 0
    for name in ("sessions", "risk_events", "checkins", "habits", "bookings", "food_logs", "cycles"):
        rows = await store.collection(name).find({"user_id": from_user})
        for row in rows:
            await store.collection(name).update_one({"id": row.get("id"), "user_id": from_user}, {"$set": {"user_id": to_user}})
            moved += 1
    return moved
