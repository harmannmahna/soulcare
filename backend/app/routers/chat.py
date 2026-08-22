from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.deps import require_user
from app.services.pipeline import ensure_session, handle_turn
from app.store import store

router = APIRouter(tags=["chat"])


class SessionBody(BaseModel):
    channel: str = "chat"


class MessageBody(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    session_id: str | None = None


@router.get("/chat/sessions")
async def list_sessions(user: dict = Depends(require_user)):
    rows = await store.collection("sessions").find({"user_id": user["id"]}, sort=[("started_at", -1)], limit=40)
    out = []
    for row in rows:
        row.pop("_id", None)
        out.append(
            {
                "id": row.get("id"),
                "channel": row.get("channel"),
                "started_at": row.get("started_at"),
                "last_tier": row.get("last_tier"),
                "peak_tier": row.get("peak_tier") or row.get("last_tier"),
                "turn_count": row.get("turn_count"),
                "summary": row.get("summary"),
                "last_companion_preview": row.get("last_companion_preview"),
            }
        )
    return out


@router.post("/chat/sessions")
async def create_session(body: SessionBody, user: dict = Depends(require_user)):
    if not user.get("consent"):
        raise HTTPException(status_code=403, detail="Consent is required before a sensitive session.")
    session = await ensure_session(
        user_id=user["id"],
        guest=bool(user.get("guest")),
        channel=body.channel,
        consent=True,
    )
    session.pop("_id", None)
    return session


@router.get("/chat/sessions/{session_id}")
async def get_session(session_id: str, user: dict = Depends(require_user)):
    session = await store.collection("sessions").find_one({"id": session_id, "user_id": user["id"]})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.pop("_id", None)
    events = await store.collection("risk_events").find({"session_id": session_id}, sort=[("created_at", 1)])
    for ev in events:
        ev.pop("_id", None)
    return {**session, "events": events}


@router.post("/chat/messages")
async def chat_message(body: MessageBody, user: dict = Depends(require_user)):
    if not user.get("consent"):
        raise HTTPException(status_code=403, detail="Consent is required before chatting about sensitive topics.")
    session = await ensure_session(
        user_id=user["id"],
        guest=bool(user.get("guest")),
        channel="chat",
        consent=True,
        session_id=body.session_id,
    )
    return await handle_turn(session=session, text=body.text, language_pref=user.get("language"))


@router.post("/call/start")
async def call_start(user: dict = Depends(require_user)):
    if not user.get("consent"):
        raise HTTPException(status_code=403, detail="Consent is required before a voice session.")
    session = await ensure_session(
        user_id=user["id"],
        guest=bool(user.get("guest")),
        channel="call",
        consent=True,
    )
    session.pop("_id", None)
    return session


@router.post("/call/turn")
async def call_turn(body: MessageBody, user: dict = Depends(require_user)):
    if not user.get("consent"):
        raise HTTPException(status_code=403, detail="Consent is required before a voice session.")
    session = await ensure_session(
        user_id=user["id"],
        guest=bool(user.get("guest")),
        channel="call",
        consent=True,
        session_id=body.session_id,
    )
    return await handle_turn(session=session, text=body.text, language_pref=user.get("language"))
