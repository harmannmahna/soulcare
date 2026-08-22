from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.config import get_settings
from app.deps import require_user
from app.services.avatar_turn import run_avatar_turn
from app.services.did_avatar import presenter_url
from app.services.pipeline import ensure_session

router = APIRouter(prefix="/avatar", tags=["avatar"])


@router.get("/config")
async def avatar_config(user: dict = Depends(require_user)):
    settings = get_settings()
    return {
        "presenter_url": presenter_url(),
        "hume_configured": bool(settings.hume_api_key),
        "did_configured": bool(settings.d_id_api_key),
    }


@router.post("/session")
async def start_session(user: dict = Depends(require_user)):
    if not user.get("consent"):
        raise HTTPException(status_code=403, detail="Consent is required before a voice session.")
    session = await ensure_session(
        user_id=user["id"],
        guest=bool(user.get("guest")),
        channel="avatar",
        consent=True,
    )
    session.pop("_id", None)
    return {"session": session, "presenter_url": presenter_url()}


@router.post("/turn")
async def avatar_turn(
    user: dict = Depends(require_user),
    audio: UploadFile | None = File(default=None),
    session_id: str | None = Form(default=None),
    transcript_hint: str | None = Form(default=None),
):
    if not user.get("consent"):
        raise HTTPException(status_code=403, detail="Consent is required before a voice session.")
    if audio is None:
        raise HTTPException(status_code=400, detail="Audio is required.")
    blob = await audio.read()
    if len(blob) > 6_000_000:
        raise HTTPException(status_code=413, detail="Audio clip is too long. Try a shorter turn.")
    if not blob:
        raise HTTPException(status_code=400, detail="Empty audio.")
    return await run_avatar_turn(
        user=user,
        audio=blob,
        filename=audio.filename or "turn.webm",
        content_type=audio.content_type or "audio/webm",
        session_id=session_id,
        transcript_hint=transcript_hint,
    )
