from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.deps import require_user
from app.services.characters import DEFAULT_CHARACTER_ID, get_character, list_characters
from app.services.companion_actions import open_habits_for_user, recent_summaries
from app.services.companion_memory import persist_summary
from app.services.pipeline import _SESSION_MEMORY, ensure_session
from app.store import store

router = APIRouter(prefix="/companion", tags=["companion"])


class PreferenceBody(BaseModel):
    selected_character_id: str | None = None


class CloseBody(BaseModel):
    session_id: str = Field(min_length=3)
    reason: str = "idle"


@router.get("/characters")
async def characters():
    return {"characters": list_characters(), "default": DEFAULT_CHARACTER_ID}


@router.get("/context")
async def companion_context(user: dict = Depends(require_user)):
    character = get_character(user.get("selected_character_id"))
    tasks = await open_habits_for_user(user["id"])
    summaries = await recent_summaries(user["id"])
    return {
        "character": character,
        "selected_character_id": character["id"],
        "open_tasks": [
            {"id": t.get("id"), "title": t.get("title"), "name": t.get("name"), "due": True, "kind": t.get("kind")}
            for t in tasks
        ],
        "summaries": summaries,
        "can_log_period": (user.get("gender") or "").lower() == "female",
    }


@router.patch("/preferences")
async def save_preferences(body: PreferenceBody, user: dict = Depends(require_user)):
    character = get_character(body.selected_character_id)
    await store.collection("users").update_one(
        {"id": user["id"]},
        {"$set": {"selected_character_id": character["id"]}},
    )
    return {"selected_character_id": character["id"], "character": character}


@router.post("/close")
async def close_session(body: CloseBody, user: dict = Depends(require_user)):
    session = await store.collection("sessions").find_one({"id": body.session_id, "user_id": user["id"]})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    history = _SESSION_MEMORY.pop(session["id"], [])
    closed = await persist_summary(session=session, history=history, reason=body.reason)
    return closed


@router.post("/sessions/open")
async def open_fresh(user: dict = Depends(require_user)):
    if not user.get("consent"):
        raise HTTPException(status_code=403, detail="Consent is required before a sensitive session.")
    session = await ensure_session(
        user_id=user["id"],
        guest=bool(user.get("guest")),
        channel="chat",
        consent=True,
    )
    session.pop("_id", None)
    character = get_character(user.get("selected_character_id"))
    summaries = await recent_summaries(user["id"], limit=3)
    return {"session": session, "character": character, "summaries": summaries}
