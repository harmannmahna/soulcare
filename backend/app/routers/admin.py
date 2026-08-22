from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect

from app.config import get_settings
from app.security import require_admin
from app.services.alerts import hub
from app.store import store

router = APIRouter(prefix="/admin", tags=["admin"])


def _clean(doc: dict | None) -> dict | None:
    if not doc:
        return None
    doc.pop("_id", None)
    return doc


@router.get("/sessions")
async def live_sessions(_: str = Depends(require_admin), active: bool | None = None):
    query = {} if active is None else {"active": active}
    rows = await store.collection("sessions").find(query, sort=[("started_at", -1)], limit=80)
    return [_clean(r) for r in rows]


@router.get("/sessions/{session_id}")
async def session_detail(session_id: str, _: str = Depends(require_admin)):
    session = await store.collection("sessions").find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    events = await store.collection("risk_events").find({"session_id": session_id}, sort=[("created_at", 1)])
    return {**_clean(session), "events": [_clean(e) for e in events]}


@router.post("/sessions/{session_id}/takeover")
async def takeover(session_id: str, _: str = Depends(require_admin)):
    session = await store.collection("sessions").find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    await store.collection("sessions").update_one(
        {"id": session_id},
        {
            "$set": {
                "taken_over": True,
                "taken_over_at": datetime.now(timezone.utc).isoformat(),
                "handoff": "mocked_counsellor_queue",
            }
        },
    )
    return {"ok": True, "session_id": session_id, "handoff": "mocked_counsellor_queue"}


@router.get("/events")
async def risk_events(_: str = Depends(require_admin), tier: str | None = None):
    query = {"tier": tier} if tier else {}
    rows = await store.collection("risk_events").find(query, sort=[("created_at", -1)], limit=120)
    return [_clean(r) for r in rows]


@router.get("/ngo-inbox")
async def ngo_inbox(_: str = Depends(require_admin)):
    rows = await store.collection("ngo_inbox").find({}, sort=[("notified_at", -1)], limit=40)
    return [_clean(r) for r in rows]


@router.get("/pages")
async def pages_map():
    rows = await store.collection("pages").find({})
    return [_clean(r) for r in rows]


async def admin_socket(ws: WebSocket, token: str = Query(default="")):
    settings = get_settings()
    if token != settings.admin_token:
        await ws.close(code=1008)
        return
    await hub.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        await hub.disconnect(ws)
    except Exception:
        await hub.disconnect(ws)
