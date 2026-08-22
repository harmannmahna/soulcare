from __future__ import annotations

import math
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.config import get_settings
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


def _km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return round(2 * r * math.asin(math.sqrt(a)), 1)


@router.get("/pharmacy")
async def pharmacies(
    lat: float | None = None,
    lng: float | None = None,
    chain: str | None = None,
    q: str | None = None,
    sort: str = "distance",
):
    geo_used = lat is not None and lng is not None
    rows = await store.collection("pharmacies").find({})
    from app.services.swytchcode_exec import exec_tool

    swy = await exec_tool(
        "firecrawl_search",
        body={"query": q or chain or "pharmacy Bengaluru Mumbai Apollo MedPlus", "limit": 5},
    )
    crawled = []
    if swy.get("ok") and not swy.get("demo"):
        result = swy.get("result") or {}
        data = result.get("result") or result.get("data") or result
        items = data.get("data") or data.get("web") or []
        if isinstance(items, list):
            for i, hit in enumerate(items[:5]):
                if not isinstance(hit, dict):
                    continue
                crawled.append(
                    {
                        "id": f"ph_swy_{i}",
                        "name": hit.get("title") or hit.get("url") or "Pharmacy listing",
                        "chain": "Swytchcode Firecrawl",
                        "city": "",
                        "area": hit.get("url") or "",
                        "open": "see listing",
                        "source": "swytchcode:firecrawl.search.create",
                        "lat": None,
                        "lng": None,
                    }
                )
    rows = list(rows) + crawled
    out = []
    needle = (q or chain or "").lower()
    for row in rows:
        item = _clean(row)
        if needle:
            blob = f"{item.get('name','')} {item.get('chain','')} {item.get('city','')} {item.get('area','')}".lower()
            if needle not in blob:
                continue
        item["source"] = item.get("source") or "swytchcode:firecrawl_or_static"
        if geo_used:
            item["distance_km"] = _km(lat, lng, float(item.get("lat") or lat), float(item.get("lng") or lng))
        else:
            item["distance_km"] = None
        item["geo_used"] = geo_used
        out.append(item)
    if geo_used and sort == "distance":
        out.sort(key=lambda r: r.get("distance_km") if r.get("distance_km") is not None else 999)
    elif sort == "name":
        out.sort(key=lambda r: r.get("name") or "")
    return out


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
    from app.services.swytchcode_exec import exec_tool

    settings = get_settings()
    cloud = ""
    raw = settings.cloudinary_url or ""
    if "@" in raw:
        cloud = raw.rsplit("@", 1)[-1].split("/")[0]
    swy = await exec_tool(
        "cloudinary_upload",
        params={"cloud_name": cloud or "demo"},
        body={"file": body.demo_file_name, "folder": "soulcare-rx", "public_id": f"rx_{user['id'][-8:]}"},
    )
    doc = {
        "id": f"rx_{uuid.uuid4().hex[:10]}",
        "user_id": user["id"],
        "title": body.title,
        "doctor": body.doctor,
        "notes": body.notes,
        "demo_file_name": body.demo_file_name,
        "scope": "demo",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "cloudinary_via": "swytchcode:cloudinary.upload.create",
        "cloudinary_demo": bool(swy.get("demo")),
    }
    await store.collection("prescriptions").insert_one(doc)
    return _clean(doc)


@router.get("/prescriptions/{rx_id}")
async def get_prescription(rx_id: str, user: dict = Depends(require_user)):
    row = await store.collection("prescriptions").find_one({"id": rx_id, "user_id": user["id"]})
    if not row:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return _clean(row)
