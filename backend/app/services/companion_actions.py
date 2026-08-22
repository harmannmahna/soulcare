"""Auditable companion tools: therapist match, booking, habits, period log."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from app.services.companion_intents import habit_log, habit_title, utc_today
from app.store import store


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def log_agent_action(
    user_id: str,
    tool: str,
    params: dict[str, Any],
    result: dict[str, Any],
    session_id: str = "",
) -> dict[str, Any]:
    row = {
        "id": f"act_{uuid.uuid4().hex[:10]}",
        "user_id": user_id,
        "session_id": session_id,
        "tool": tool,
        "params": params,
        "result": {k: v for k, v in result.items() if k != "raw"},
        "ok": bool(result.get("ok", True)),
        "created_at": _now(),
    }
    await store.collection("agent_actions").insert_one(row)
    return row


async def suggest_therapist(
    user: dict[str, Any],
    problem_description: str,
    limit: int = 3,
    session_id: str = "",
) -> dict[str, Any]:
    from app.services.therapist_matching import rank_therapists

    cards = await rank_therapists(query=problem_description or "", tags=[], limit=limit)
    payload = {
        "ok": True,
        "therapists": [
            {
                "id": c.get("id"),
                "name": c.get("name"),
                "tags": c.get("tags") or c.get("specialties") or [],
                "specialties": c.get("tags") or c.get("specialties") or [],
                "reason": c.get("match_reason") or c.get("reason"),
                "match_reason": c.get("match_reason"),
                "city": c.get("city"),
                "price_inr": c.get("price_inr"),
                "similarity": c.get("similarity"),
            }
            for c in cards
        ],
    }
    await log_agent_action(
        str(user.get("id") or ""),
        "suggest_therapist",
        {"problem_description": (problem_description or "")[:180]},
        payload,
        session_id=session_id,
    )
    return payload


async def book_therapist_session(
    user: dict[str, Any],
    therapist_id: str,
    requested_time: str = "",
    session_id: str = "",
) -> dict[str, Any]:
    therapist = await store.collection("therapists").find_one({"id": therapist_id})
    if not therapist:
        result = {"ok": False, "error": "Therapist not found."}
        await log_agent_action(
            str(user.get("id") or ""),
            "book_therapist_session",
            {"therapist_id": therapist_id, "requested_time": requested_time},
            result,
            session_id=session_id,
        )
        return result
    slots = await store.collection("slots").find({"therapist_id": therapist_id}, sort=[("starts_at", 1)])
    slot = None
    needle = (requested_time or "").strip().lower()
    for item in slots:
        if item.get("taken"):
            continue
        label = f"{item.get('label') or ''} {item.get('starts_at') or ''}".lower()
        if not needle or needle in label or needle in therapist_id.lower():
            slot = item
            break
    if not slot:
        open_slots = [s for s in slots if not s.get("taken")]
        slot = open_slots[0] if open_slots else None
    if not slot:
        result = {"ok": False, "error": "No open slots for that therapist."}
        await log_agent_action(
            user["id"],
            "book_therapist_session",
            {"therapist_id": therapist_id, "requested_time": requested_time},
            result,
            session_id=session_id,
        )
        return result
    booking = {
        "id": f"bk_{uuid.uuid4().hex[:10]}",
        "user_id": user["id"],
        "therapist_id": therapist["id"],
        "therapist_name": therapist.get("name"),
        "slot_id": slot["id"],
        "starts_at": slot.get("starts_at"),
        "label": slot.get("label") or requested_time or slot.get("starts_at"),
        "status": "confirmed",
        "created_at": _now(),
        "client_name": user.get("name") or "SoulCare member",
        "client_email": user.get("email"),
        "source": "companion_agent",
    }
    await store.collection("bookings").insert_one(booking)
    await store.collection("slots").update_one({"id": slot["id"]}, {"$set": {"taken": True}})
    result = {
        "ok": True,
        "booking_id": booking["id"],
        "therapist_id": therapist["id"],
        "therapist_name": therapist.get("name"),
        "slot": booking["label"],
        "starts_at": booking["starts_at"],
        "message": f"Booked {therapist.get('name')} for {booking['label']}.",
    }
    await log_agent_action(
        user["id"],
        "book_therapist_session",
        {"therapist_id": therapist_id, "requested_time": requested_time},
        result,
        session_id=session_id,
    )
    return result


async def update_task(user: dict[str, Any], task_id: str, status: str, session_id: str = "") -> dict[str, Any]:
    habit = await store.collection("habits").find_one({"id": task_id, "user_id": user["id"]})
    if not habit:
        result = {"ok": False, "error": "Task not found."}
        await log_agent_action(
            user["id"],
            "update_task",
            {"task_id": task_id, "status": status},
            result,
            session_id=session_id,
        )
        return result
    day = utc_today()
    mapped = {"done": "done", "partial": "partial", "open": "open", "skipped": "open"}.get(status, status)
    done_flag = mapped == "done"
    log = [item for item in habit_log(habit) if item.get("date") != day]
    entry: dict[str, Any] = {"date": day, "done": done_flag}
    if mapped == "partial":
        entry["status"] = "partial"
        entry["done"] = False
    elif mapped == "open":
        entry["status"] = "open"
        entry["done"] = False
    else:
        entry["status"] = "done"
    log.append(entry)
    await store.collection("habits").update_one({"id": task_id, "user_id": user["id"]}, {"$set": {"log": log}})
    result = {
        "ok": True,
        "task_id": task_id,
        "title": habit_title(habit),
        "status": mapped,
        "date": day,
    }
    await log_agent_action(user["id"], "update_task", {"task_id": task_id, "status": status}, result, session_id=session_id)
    return result


async def log_period_entry(
    user: dict[str, Any],
    day: str | None = None,
    kind: str = "start",
    session_id: str = "",
) -> dict[str, Any]:
    if (user.get("gender") or "").lower() != "female":
        result = {"ok": False, "error": "Period logging is only available for female profiles."}
        await log_agent_action(
            str(user.get("id") or ""),
            "log_period_entry",
            {"date": day, "kind": kind},
            result,
            session_id=session_id,
        )
        return result
    day = day or utc_today()
    existing = await store.collection("cycles").find_one({"user_id": user["id"]})
    days = list((existing or {}).get("days") or [])
    if day not in days:
        days.append(day)
        days = sorted(set(days))
    payload = {"user_id": user["id"], "days": days, "updated_at": _now(), "last_kind": kind, "last_start": day if kind == "start" else (existing or {}).get("last_start")}
    if existing:
        await store.collection("cycles").update_one({"user_id": user["id"]}, {"$set": payload})
    else:
        payload["id"] = f"cyc_{uuid.uuid4().hex[:10]}"
        await store.collection("cycles").insert_one(payload)
    result = {"ok": True, "date": day, "kind": kind, "days": days[-8:]}
    await log_agent_action(user["id"], "log_period_entry", {"date": day, "kind": kind}, result, session_id=session_id)
    return result


async def open_habits_for_user(user_id: str) -> list[dict[str, Any]]:
    from app.services.companion_intents import habit_is_open_today

    rows = await store.collection("habits").find({"user_id": user_id})
    out = []
    for habit in rows:
        if habit.get("active", True) is False:
            continue
        if habit_is_open_today(habit):
            item = {k: v for k, v in habit.items() if k != "_id"}
            item["title"] = habit_title(habit)
            item["due"] = True
            out.append(item)
    return out


async def recent_summaries(user_id: str, limit: int = 6) -> list[dict[str, Any]]:
    rows = await store.collection("conversation_summaries").find(
        {"user_id": user_id},
        sort=[("created_at", -1)],
        limit=limit,
    )
    return [{k: v for k, v in row.items() if k != "_id"} for row in rows]


async def find_therapist_for_booking(text: str, suggested_ids: list[str] | None = None) -> str | None:
    raw = (text or "").lower()
    therapists = await store.collection("therapists").find({})
    for t in therapists:
        name = (t.get("name") or "").lower()
        if name and any(part and part in raw for part in name.replace("dr.", "").split() if len(part) > 3):
            return t.get("id")
    if suggested_ids:
        return suggested_ids[0]
    return therapists[0]["id"] if therapists else None
