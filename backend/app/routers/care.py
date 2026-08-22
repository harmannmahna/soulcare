from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.deps import require_user
from app.services.pipeline import match_therapists
from app.store import store

router = APIRouter(tags=["care"])


class BookingBody(BaseModel):
    therapist_id: str
    slot_id: str


class SaveBody(BaseModel):
    resource_id: str


def _clean(doc: dict | None) -> dict | None:
    if not doc:
        return None
    doc.pop("_id", None)
    return doc


@router.get("/therapists")
async def list_therapists(tag: str | None = None, q: str | None = None):
    rows = await store.collection("therapists").find({})
    if tag:
        rows = [t for t in rows if tag.lower() in {x.lower() for x in t.get("tags", [])}]
    if q:
        needle = q.lower()
        rows = [
            t
            for t in rows
            if needle in t.get("name", "").lower()
            or needle in t.get("city", "").lower()
            or any(needle in x.lower() for x in t.get("tags", []))
        ]
    return [_clean(t) for t in rows]


@router.get("/therapists/match")
async def therapist_match(tags: str):
    tag_list = [t.strip() for t in tags.split(",") if t.strip()]
    return await match_therapists(tag_list)


@router.get("/therapists/{therapist_id}")
async def therapist_detail(therapist_id: str):
    row = await store.collection("therapists").find_one({"id": therapist_id})
    if not row:
        raise HTTPException(status_code=404, detail="Therapist not found")
    slots = await store.collection("slots").find({"therapist_id": therapist_id}, sort=[("starts_at", 1)])
    return {**_clean(row), "slots": [_clean(s) for s in slots]}


@router.post("/bookings")
async def create_booking(body: BookingBody, user: dict = Depends(require_user)):
    therapist = await store.collection("therapists").find_one({"id": body.therapist_id})
    slot = await store.collection("slots").find_one({"id": body.slot_id, "therapist_id": body.therapist_id})
    if not therapist or not slot:
        raise HTTPException(status_code=404, detail="Therapist or slot not found")
    if slot.get("taken"):
        raise HTTPException(status_code=409, detail="That slot is no longer open.")
    booking = {
        "id": f"bk_{uuid.uuid4().hex[:10]}",
        "user_id": user["id"],
        "therapist_id": therapist["id"],
        "therapist_name": therapist["name"],
        "slot_id": slot["id"],
        "starts_at": slot.get("starts_at"),
        "label": slot.get("label"),
        "status": "confirmed",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await store.collection("bookings").insert_one(booking)
    await store.collection("slots").update_one({"id": slot["id"]}, {"$set": {"taken": True}})
    return _clean(booking)


@router.get("/bookings/{booking_id}")
async def get_booking(booking_id: str, user: dict = Depends(require_user)):
    row = await store.collection("bookings").find_one({"id": booking_id, "user_id": user["id"]})
    if not row:
        raise HTTPException(status_code=404, detail="Booking not found")
    return _clean(row)


@router.get("/resources")
async def list_resources(kind: str | None = None):
    rows = await store.collection("resources").find({})
    if kind:
        rows = [r for r in rows if r.get("kind") == kind]
    return [_clean(r) for r in rows]


@router.get("/resources/{resource_id}")
async def resource_detail(resource_id: str):
    row = await store.collection("resources").find_one({"id": resource_id})
    if not row:
        raise HTTPException(status_code=404, detail="Resource not found")
    return _clean(row)


@router.post("/resources/{resource_id}/save")
async def save_resource(resource_id: str, user: dict = Depends(require_user)):
    row = await store.collection("resources").find_one({"id": resource_id})
    if not row:
        raise HTTPException(status_code=404, detail="Resource not found")
    saved = list(user.get("saved_resources") or [])
    if resource_id not in saved:
        saved.append(resource_id)
        await store.collection("users").update_one({"id": user["id"]}, {"$set": {"saved_resources": saved}})
    return {"saved_resources": saved}


@router.get("/saved-resources")
async def saved_resources(user: dict = Depends(require_user)):
    ids = user.get("saved_resources") or []
    rows = []
    for rid in ids:
        row = await store.collection("resources").find_one({"id": rid})
        if row:
            rows.append(_clean(row))
    return rows


@router.get("/help")
async def help_directory():
    rows = await store.collection("help").find({})
    return [_clean(r) for r in rows]
