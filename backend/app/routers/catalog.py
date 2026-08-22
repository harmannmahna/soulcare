from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.deps import require_user
from app.store import store

router = APIRouter(tags=["catalog"])


class PrescriptionBody(BaseModel):
    title: str = Field(min_length=1, max_length=80)
    doctor: str = ""
    notes: str = ""
    demo_file_name: str = "prescription.jpg"


def _clean(doc: dict | None) -> dict | None:
    if not doc:
        return None
    doc.pop("_id", None)
    return doc


@router.get("/medicines")
async def medicines():
    return [_clean(r) for r in await store.collection("medicines").find({})]


@router.get("/medicines/{medicine_id}")
async def medicine_detail(medicine_id: str):
    row = await store.collection("medicines").find_one({"id": medicine_id})
    if not row:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return _clean(row)


@router.get("/pharmacy")
async def pharmacies():
    return [_clean(r) for r in await store.collection("pharmacies").find({})]


@router.get("/pharmacy/{pharmacy_id}")
async def pharmacy_detail(pharmacy_id: str):
    row = await store.collection("pharmacies").find_one({"id": pharmacy_id})
    if not row:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
    products = []
    for mid in row.get("products") or []:
        med = await store.collection("medicines").find_one({"id": mid})
        if med:
            products.append(_clean(med))
    return {**_clean(row), "catalog": products}


@router.post("/prescriptions")
async def upload_prescription(body: PrescriptionBody, user: dict = Depends(require_user)):
    doc = {
        "id": f"rx_{uuid.uuid4().hex[:10]}",
        "user_id": user["id"],
        "title": body.title,
        "doctor": body.doctor,
        "notes": body.notes,
        "demo_file_name": body.demo_file_name,
        "scope": "demo",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await store.collection("prescriptions").insert_one(doc)
    return _clean(doc)


@router.get("/prescriptions/{rx_id}")
async def get_prescription(rx_id: str, user: dict = Depends(require_user)):
    row = await store.collection("prescriptions").find_one({"id": rx_id, "user_id": user["id"]})
    if not row:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return _clean(row)
