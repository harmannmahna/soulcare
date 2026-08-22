"""Chat / voice turn pipeline.

Order is intentional and must stay this way:
1. Classify risk on the server (isolated function).
2. Blend optional vocal-distress as an extra signal (never downgrades red).
3. Persist only metadata (never raw message text).
4. If RED: return the fixed safety script, broadcast admin alert, do not call an LLM.
5. Otherwise generate a companion reply (Gemini or MockAI) and optionally match therapists.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app.services.alerts import hub
from app.services.ai import get_ai_provider, provider_label
from app.services.characters import get_character
from app.services.companion_actions import (
    book_therapist_session,
    find_therapist_for_booking,
    log_period_entry,
    open_habits_for_user,
    recent_summaries,
    suggest_therapist,
    update_task,
)
from app.services.companion_intents import (
    detect_period_mention,
    match_habit_from_text,
    parse_task_update_from_reply,
    wants_booking,
    wants_therapist_suggest,
)
from app.services.ngo_notify import notify_red, safety_copy
from app.services.risk_triage import RiskTier, classify_risk, public_risk_payload
from app.services.therapist_matching import rank_therapists
from app.services.voice_tone_analysis import blend_vocal_into_risk, score_samples_librosa, score_voice_features
from app.store import store

# In-process only — used for short conversational context, not long-term storage.
_SESSION_MEMORY: dict[str, list[dict]] = {}
_SESSION_HINTS: dict[str, dict] = {}


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
    character_id: str | None = None,
) -> dict:
    sessions = store.collection("sessions")
    if session_id:
        existing = await sessions.find_one({"id": session_id})
        if existing:
            if character_id:
                character = get_character(character_id)
                await sessions.update_one({"id": existing["id"]}, {"$set": {"character_id": character["id"]}})
                existing["character_id"] = character["id"]
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
        "character_id": get_character(character_id)["id"],
    }
    await sessions.insert_one(doc)
    return doc


def _build_extra_context(
    *,
    character: dict,
    open_tasks: list[dict],
    summaries: list[dict],
    turn_count: int,
    actions: list[dict],
) -> str:
    parts = [
        f"You are speaking as {character['name']} ({character['nationality']}, {character['gender']}). "
        f"Voice style: {character['voiceStyle']}. Stay warm and calm; never change the therapeutic tone."
    ]
    if summaries:
        recent = "; ".join((row.get("summary") or "")[:140] for row in summaries[:3] if row.get("summary"))
        if recent:
            parts.append(f"Prior session summaries (not transcripts): {recent}")
            last = (summaries[0].get("summary") or "")[:120]
            parts.append(f"Last time: {last}")
    if open_tasks:
        titles = ", ".join((t.get("title") or t.get("name") or "a habit") for t in open_tasks[:4])
        parts.append(f"Open tasks due today: {titles}.")
        if turn_count > 0 and turn_count % 3 == 1:
            first = open_tasks[0]
            title = first.get("title") or first.get("name")
            parts.append(f"At a natural moment, ask about '{title}' — not every message.")
    if actions:
        notes = []
        for act in actions:
            tool = act.get("tool")
            res = act.get("result") or {}
            if tool == "log_period_entry" and res.get("ok"):
                notes.append("The user mentioned their period; it is logged. Acknowledge briefly.")
            if tool == "update_task" and res.get("ok"):
                notes.append(f"Checklist updated: {res.get('title')} is {res.get('status')}.")
            if tool == "book_therapist_session" and res.get("ok"):
                notes.append(f"Booking confirmed with {res.get('therapist_name')} at {res.get('slot')}.")
            if tool == "suggest_therapist" and res.get("ok"):
                names = ", ".join(t.get("name") or "" for t in (res.get("therapists") or [])[:2])
                notes.append(f"Therapist matches to mention conversationally: {names}.")
        if notes:
            parts.append("Actions already taken this turn: " + " ".join(notes))
    return "\n".join(parts)


async def _run_companion_tools(*, user: dict | None, text: str, session: dict) -> list[dict]:
    if not user or user.get("guest"):
        return []
    sid = session["id"]
    hints = _SESSION_HINTS.setdefault(sid, {"suggested": [], "last_task": None})
    executed: list[dict] = []

    if (user.get("gender") or "").lower() == "female":
        period = detect_period_mention(text)
        if period:
            result = await log_period_entry(user, kind=period, session_id=sid)
            executed.append({"tool": "log_period_entry", "result": result})

    open_tasks = await open_habits_for_user(user["id"])
    status = parse_task_update_from_reply(text)
    if status and open_tasks:
        habit = match_habit_from_text(text, open_tasks)
        if not habit and hints.get("last_task"):
            habit = next((h for h in open_tasks if h.get("id") == hints["last_task"]), open_tasks[0])
        if habit:
            result = await update_task(user, habit["id"], status, session_id=sid)
            executed.append({"tool": "update_task", "result": result})

    if wants_therapist_suggest(text):
        result = await suggest_therapist(user, text, session_id=sid)
        hints["suggested"] = [t.get("id") for t in (result.get("therapists") or []) if t.get("id")]
        executed.append({"tool": "suggest_therapist", "result": result})

    if wants_booking(text):
        therapist_id = await find_therapist_for_booking(text, hints.get("suggested"))
        if therapist_id:
            result = await book_therapist_session(user, therapist_id, session_id=sid)
            executed.append({"tool": "book_therapist_session", "result": result})

    if open_tasks and session.get("turn_count", 0) % 3 == 1:
        hints["last_task"] = open_tasks[0].get("id")
    return executed


def _append_action_acks(reply: str, actions: list[dict]) -> str:
    extra = []
    blob = (reply or "").lower()
    for act in actions:
        tool = act.get("tool")
        res = act.get("result") or {}
        if not res.get("ok"):
            continue
        if tool == "log_period_entry" and "logged" not in blob:
            extra.append("Got it, I've logged today in your tracker.")
        if tool == "update_task":
            extra.append(f"I've marked '{res.get('title')}' as {res.get('status')} on your checklist.")
        if tool == "book_therapist_session":
            extra.append(f"You're booked with {res.get('therapist_name')} for {res.get('slot')}.")
    if not extra:
        return reply
    return (reply or "").rstrip() + " " + " ".join(extra)


async def handle_turn(
    *,
    session: dict,
    text: str,
    language_pref: str | None,
    user: dict | None = None,
    character_id: str | None = None,
    vocal_features: dict | None = None,
    vocal_samples: list | None = None,
) -> dict:
    result = classify_risk(text)
    vocal = score_voice_features(vocal_features)
    if vocal is None and vocal_samples:
        vocal = score_samples_librosa(vocal_samples)
    result = blend_vocal_into_risk(result, vocal)

    character = get_character(character_id or session.get("character_id") or (user or {}).get("selected_character_id"))
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
        "character_id": character["id"],
        "created_at": _now(),
    }
    if vocal:
        event["vocal_distress"] = vocal.distress
        event["vocal_affect"] = vocal.affect
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
                    "character_id": character["id"],
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
            "ai_backend": "safety_script",
            "therapists": [],
            "event_id": event["id"],
            "character": character,
            "actions": [],
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
                "character_id": character["id"],
                "summary": f"{result.tier.value} · {result.problem_type.value}",
            },
            "$inc": {"turn_count": 1},
        },
    )
    session["turn_count"] = int(session.get("turn_count") or 0) + 1
    session["peak_tier"] = peak
    session["last_tier"] = result.tier.value
    session["last_problem"] = result.problem_type.value
    session["character_id"] = character["id"]

    actions = await _run_companion_tools(user=user, text=text, session=session)
    open_tasks: list[dict] = []
    summaries: list[dict] = []
    if user and not user.get("guest"):
        open_tasks = await open_habits_for_user(user["id"])
        summaries = await recent_summaries(user["id"])

    extra_context = _build_extra_context(
        character=character,
        open_tasks=open_tasks,
        summaries=summaries,
        turn_count=session.get("turn_count") or 0,
        actions=actions,
    )

    hinglish = wants_hinglish(text, language_pref)
    provider = get_ai_provider()
    reply = await provider.generate(
        text,
        yellow=result.tier == RiskTier.YELLOW,
        hinglish=hinglish,
        history=history,
        extra_context=extra_context,
        character=character,
    )
    reply = _append_action_acks(reply, actions)
    history.append({"role": "user", "text": text[:500]})
    history.append({"role": "assistant", "text": reply[:800]})
    if len(history) > 12:
        del history[:-12]

    therapists = []
    for act in actions:
        if act.get("tool") == "suggest_therapist":
            therapists = (act.get("result") or {}).get("therapists") or []
    if result.tier == RiskTier.YELLOW and not therapists:
        therapists = await match_therapists(result.tags, query=text)
        public["checkin_after"] = True
    if result.tier == RiskTier.YELLOW:
        public["checkin_after"] = True
        hints = _SESSION_HINTS.setdefault(session["id"], {"suggested": [], "last_task": None})
        hints["suggested"] = [t.get("id") for t in therapists if t.get("id")]

    await store.collection("sessions").update_one(
        {"id": session["id"]},
        {
            "$set": {
                "last_companion_preview": reply[:240],
                "last_problem": result.problem_type.value,
                "character_id": character["id"],
            }
        },
    )

    return {
        "session_id": session["id"],
        "risk": public,
        "reply": reply,
        "llm_used": True,
        "ai_backend": provider_label(),
        "therapists": therapists,
        "event_id": event["id"],
        "character": character,
        "actions": [
            {"tool": a.get("tool"), "ok": bool((a.get("result") or {}).get("ok")), "result": a.get("result")}
            for a in actions
        ],
        "open_tasks": [{"id": t.get("id"), "title": t.get("title") or t.get("name"), "due": True} for t in open_tasks],
    }


async def transfer_sessions(from_user: str, to_user: str) -> int:
    moved = 0
    for name in (
        "sessions",
        "risk_events",
        "checkins",
        "habits",
        "bookings",
        "food_logs",
        "cycles",
        "conversation_summaries",
        "agent_actions",
    ):
        rows = await store.collection(name).find({"user_id": from_user})
        for row in rows:
            await store.collection(name).update_one({"id": row.get("id"), "user_id": from_user}, {"$set": {"user_id": to_user}})
            moved += 1
    return moved
