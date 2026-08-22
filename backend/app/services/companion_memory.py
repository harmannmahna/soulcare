"""Summary-based conversation memory. Never persist raw transcripts."""
from __future__ import annotations

import re
from datetime import datetime, timezone

from app.services.companion_quotes import GOODBYE, rotating_quote
from app.store import store

_TOPIC_HINTS = (
    ("exam", "exam stress"),
    ("jee", "exam stress"),
    ("neet", "exam stress"),
    ("study", "studies"),
    ("sleep", "sleep"),
    ("neend", "sleep"),
    ("work", "work stress"),
    ("office", "work stress"),
    ("period", "cycle tracking"),
    ("habit", "habits"),
    ("therapist", "finding support"),
    ("anxious", "anxiety"),
    ("anxiety", "anxiety"),
    ("sad", "low mood"),
    ("lonely", "loneliness"),
    ("family", "family"),
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def topics_from_history(history: list[dict]) -> list[str]:
    blob = " ".join(str(h.get("text") or "") for h in history if h.get("role") == "user").lower()
    found: list[str] = []
    for needle, label in _TOPIC_HINTS:
        if needle in blob and label not in found:
            found.append(label)
    return found[:4]


def build_summary(*, session: dict, history: list[dict], actions: list[dict]) -> str:
    topics = topics_from_history(history)
    problem = session.get("last_problem") or "a general check-in"
    peak = session.get("peak_tier") or session.get("last_tier") or "green"
    turns = int(session.get("turn_count") or len([h for h in history if h.get("role") == "user"]))
    topic_bit = ", ".join(topics) if topics else problem.replace("_", " ")
    tools = []
    for row in actions:
        tool = row.get("tool")
        if tool == "update_task":
            title = (row.get("result") or {}).get("title") or "a task"
            tools.append(f"updated {title}")
        elif tool == "log_period_entry":
            tools.append("logged a cycle day")
        elif tool == "book_therapist_session":
            name = (row.get("result") or {}).get("therapist_name") or "a therapist"
            tools.append(f"booked {name}")
        elif tool == "suggest_therapist":
            tools.append("suggested therapists")
    action_bit = (" Actions: " + "; ".join(tools) + ".") if tools else ""
    return (
        f"Session covered {topic_bit} across {turns} turns (peak {peak})."
        f"{action_bit} No raw transcript kept."
    )


async def persist_summary(*, session: dict, history: list[dict], reason: str = "close") -> dict:
    actions = await store.collection("agent_actions").find({"session_id": session["id"]})
    summary = build_summary(session=session, history=history, actions=actions)
    summary = re.sub(r"\s+", " ", summary).strip()[:480]
    doc = {
        "id": f"sum_{session['id'][-10:]}",
        "user_id": session.get("user_id"),
        "session_id": session["id"],
        "date": datetime.now(timezone.utc).date().isoformat(),
        "summary": summary,
        "peak_tier": session.get("peak_tier") or session.get("last_tier"),
        "character_id": session.get("character_id"),
        "reason": reason,
        "created_at": _now(),
    }
    existing = await store.collection("conversation_summaries").find_one({"session_id": session["id"]})
    if existing:
        await store.collection("conversation_summaries").update_one(
            {"session_id": session["id"]},
            {"$set": {k: v for k, v in doc.items() if k != "id"}},
        )
        doc["id"] = existing.get("id") or doc["id"]
    else:
        await store.collection("conversation_summaries").insert_one(doc)
    await store.collection("sessions").update_one(
        {"id": session["id"]},
        {
            "$set": {
                "active": False,
                "summary": summary,
                "ended_at": _now(),
                "close_reason": reason,
            }
        },
    )
    seed = abs(hash(session["id"]))
    return {
        "summary": summary,
        "goodbye": GOODBYE,
        "quote": rotating_quote(seed),
        "session_id": session["id"],
    }
