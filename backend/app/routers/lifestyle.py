from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.deps import require_user
from app.store import store

router = APIRouter(tags=["lifestyle"])


ROOM_CATALOG = [
    {"id": "plant", "name": "Peace lily", "cost": 40, "emoji": "🌿", "x": 18, "y": 62},
    {"id": "lamp", "name": "Warm lamp", "cost": 55, "emoji": "💡", "x": 72, "y": 48},
    {"id": "rug", "name": "Soft rug", "cost": 70, "emoji": "🧶", "x": 42, "y": 78},
    {"id": "chair", "name": "Reading chair", "cost": 90, "emoji": "🪑", "x": 58, "y": 58},
    {"id": "window", "name": "Garden window", "cost": 120, "emoji": "🪟", "x": 50, "y": 18},
    {"id": "cat", "name": "Sleepy cat", "cost": 150, "emoji": "🐱", "x": 28, "y": 72},
    {"id": "bookshelf", "name": "Bookshelf", "cost": 80, "emoji": "📚", "x": 12, "y": 40},
    {"id": "candle", "name": "Soy candle", "cost": 25, "emoji": "🕯️", "x": 80, "y": 70},
    {"id": "art", "name": "Leaf print", "cost": 45, "emoji": "🖼️", "x": 78, "y": 22},
    {"id": "tea", "name": "Tea tray", "cost": 30, "emoji": "🍵", "x": 64, "y": 74},
]


EXERCISES = [
    {
        "id": "ex_walk",
        "name": "Ten-minute walk",
        "body_part": "full body",
        "minutes": 10,
        "level": "gentle",
        "why": "Lowers rumination and lifts mood without a gym.",
        "steps": ["Step outside or walk a corridor.", "Notice three colours.", "Keep the phone in a pocket."],
        "video_url": "https://www.youtube.com/embed/3sEeVJEXTfY",
    },
    {
        "id": "ex_sun_salute",
        "name": "Easy sun salutations",
        "body_part": "spine / hips",
        "minutes": 8,
        "level": "gentle",
        "why": "Opens the chest after long sitting and settles breath.",
        "steps": ["Mountain pose.", "Fold forward.", "Step back, low plank, cobra, downward dog.", "Repeat 4 times."],
        "video_url": "https://www.youtube.com/embed/8Pwe0kAhE_g",
    },
    {
        "id": "ex_desk",
        "name": "Desk reset",
        "body_part": "neck / shoulders",
        "minutes": 5,
        "level": "gentle",
        "why": "Unhooks jaw and shoulder tension from screens.",
        "steps": ["Roll shoulders 8 times.", "Chin tucks x 8.", "Wrist circles.", "Stand and shake out."],
        "video_url": "https://www.youtube.com/embed/RqcOCBb4arc",
    },
    {
        "id": "ex_core",
        "name": "Soft core set",
        "body_part": "core",
        "minutes": 12,
        "level": "moderate",
        "why": "Builds the kind of strength that helps posture and anxiety in the body.",
        "steps": ["Dead bug 8/side.", "Glute bridge 12.", "Side plank 20s/side.", "Rest, repeat twice."],
        "video_url": "https://www.youtube.com/embed/qfQq-G3_x0Y",
    },
    {
        "id": "ex_yoga_nidra",
        "name": "Yoga nidra rest",
        "body_part": "nervous system",
        "minutes": 15,
        "level": "restorative",
        "why": "A lying-down practice for nights when sleep will not come.",
        "steps": ["Lie down, cover yourself.", "Follow a body scan.", "If you drift, that still counts."],
        "video_url": "https://www.youtube.com/embed/M0u9GST_j3s",
    },
    {
        "id": "ex_strength",
        "name": "Bodyweight strength",
        "body_part": "legs / arms",
        "minutes": 18,
        "level": "moderate",
        "why": "Physical health supports mental health — this is the weekly backbone.",
        "steps": ["Squats 12.", "Wall push-ups 10.", "Reverse lunges 8/side.", "Repeat 3 rounds."],
        "video_url": "https://www.youtube.com/embed/UItWltVZZmE",
    },
]


class FocusCompleteBody(BaseModel):
    minutes: int = Field(ge=1, le=90)
    kind: str = "focus"


class RoomBuyBody(BaseModel):
    item_id: str


class PartnerBody(BaseModel):
    role: str = Field(pattern="^(therapist|chemist)$")
    name: str = Field(min_length=2, max_length=80)
    email: str
    city: str = ""
    specialty: str = ""
    notes: str = ""


class PhoneBody(BaseModel):
    source: str = "visibility"


class FoodScanBody(BaseModel):
    filename: str = ""
    hint: str = ""


class FriendBody(BaseModel):
    alias: str = Field(min_length=2, max_length=40)


def _clean(doc: dict | None) -> dict | None:
    if not doc:
        return None
    doc.pop("_id", None)
    return doc


def _points_for(minutes: int, kind: str) -> int:
    if kind == "break":
        return max(2, minutes // 2)
    return max(8, minutes)


@router.get("/exercises")
async def list_exercises(q: str | None = None):
    rows = list(EXERCISES)
    if q:
        needle = q.lower()
        rows = [
            r
            for r in rows
            if needle in r["name"].lower()
            or needle in r["body_part"].lower()
            or needle in r["level"].lower()
        ]
    return rows


@router.get("/exercises/{exercise_id}")
async def exercise_detail(exercise_id: str):
    for row in EXERCISES:
        if row["id"] == exercise_id:
            return row
    raise HTTPException(status_code=404, detail="Exercise not found")


@router.get("/focus")
async def focus_state(user: dict = Depends(require_user)):
    logs = await store.collection("focus_logs").find({"user_id": user["id"]}, sort=[("created_at", -1)], limit=20)
    owned = set(user.get("room_items") or [])
    catalog = [{**item, "owned": item["id"] in owned} for item in ROOM_CATALOG]
    return {
        "points": int(user.get("focus_points") or 0),
        "room_items": list(owned),
        "catalog": catalog,
        "history": [_clean(r) for r in logs],
    }


@router.post("/focus/complete")
async def complete_focus(body: FocusCompleteBody, user: dict = Depends(require_user)):
    gained = _points_for(body.minutes, body.kind)
    doc = {
        "id": f"foc_{uuid.uuid4().hex[:10]}",
        "user_id": user["id"],
        "minutes": body.minutes,
        "kind": body.kind,
        "points": gained,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await store.collection("focus_logs").insert_one(doc)
    await store.collection("users").update_one({"id": user["id"]}, {"$inc": {"focus_points": gained}})
    user["focus_points"] = int(user.get("focus_points") or 0) + gained
    return {"gained": gained, "points": user["focus_points"], "log": _clean(doc)}


@router.post("/focus/room/buy")
async def buy_room_item(body: RoomBuyBody, user: dict = Depends(require_user)):
    item = next((x for x in ROOM_CATALOG if x["id"] == body.item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    owned = list(user.get("room_items") or [])
    if item["id"] in owned:
        raise HTTPException(status_code=409, detail="You already placed this in your room.")
    points = int(user.get("focus_points") or 0)
    if points < item["cost"]:
        raise HTTPException(status_code=400, detail=f"Need {item['cost']} points. You have {points}.")
    owned.append(item["id"])
    await store.collection("users").update_one(
        {"id": user["id"]},
        {"$set": {"room_items": owned, "focus_points": points - item["cost"]}},
    )
    return {"ok": True, "item": item, "points": points - item["cost"], "room_items": owned}


B2B_SNAPSHOT = {
    "static": True,
    "updated": "2026-08-22",
    "scope": "aggregate_only",
    "partner_note": "Institutional view. No names, session IDs, or chat text. Sample numbers for the demo week.",
    "totals": {
        "colleges": 12,
        "students_on_app": 4820,
        "students_depressed_flag": 614,
        "depressed_pct": 12.7,
        "yellow_risk_alerts": 318,
        "yellow_pct": 6.6,
        "red_escalations": 41,
        "red_pct": 0.9,
        "weekly_checkins": 2104,
        "weekly_active_users": 1964,
        "engagement_pct": 40.7,
        "avg_sessions_per_user": 2.4,
        "habit_completions": 3188,
        "therapist_bookings": 86,
        "ngo_notifications": 41,
    },
    "this_week": {
        "label": "17–22 Aug 2026",
        "flagged_yellow_pct": 6.6,
        "flagged_red_pct": 0.9,
        "checkin_rate_pct": 43.6,
        "talk_now_starts": 890,
        "resource_opens": 1240,
    },
    "colleges": [
        {"name": "National Institute of Technology — Demo", "students": 640, "depressed_pct": 14.2, "yellow_pct": 7.1, "app_pct": 38, "engagement_pct": 44},
        {"name": "City Medical College", "students": 410, "depressed_pct": 11.0, "yellow_pct": 5.4, "app_pct": 44, "engagement_pct": 51},
        {"name": "Valley School of Design", "students": 280, "depressed_pct": 9.8, "yellow_pct": 4.9, "app_pct": 51, "engagement_pct": 58},
        {"name": "Harbour Arts University", "students": 355, "depressed_pct": 13.5, "yellow_pct": 8.2, "app_pct": 29, "engagement_pct": 33},
    ],
}


@router.get("/surveillance")
async def surveillance():
    """Static B2B college wellness snapshot — demo numbers only."""
    return B2B_SNAPSHOT


@router.get("/b2b/snapshot")
async def b2b_snapshot():
    return B2B_SNAPSHOT


WELLNESS_VIDEOS = [
    {
        "id": "yt_box",
        "title": "Box breathing (4-4-4-4)",
        "topic": "breathing",
        "youtube_id": "tEmt1Znux58",
        "embed": "https://www.youtube.com/embed/tEmt1Znux58",
        "why": "Guided square breath for a racing mind.",
    },
    {
        "id": "yt_478",
        "title": "4-7-8 breathing for sleep",
        "topic": "sleep",
        "youtube_id": "YRPh_GaiL8s",
        "embed": "https://www.youtube.com/embed/YRPh_GaiL8s",
        "why": "Night wind-down when thoughts will not quiet.",
    },
    {
        "id": "yt_walk",
        "title": "Ten-minute mindful walk",
        "topic": "movement",
        "youtube_id": "3sEeVJEXTfY",
        "embed": "https://www.youtube.com/embed/3sEeVJEXTfY",
        "why": "Low-bar movement that still counts as care.",
    },
    {
        "id": "yt_nidra",
        "title": "Yoga nidra rest",
        "topic": "rest",
        "youtube_id": "M0u9GST_j3s",
        "embed": "https://www.youtube.com/embed/M0u9GST_j3s",
        "why": "Lying-down practice for nights when sleep will not come.",
    },
]


@router.get("/wellness/videos")
async def wellness_videos():
    """Curated YouTube embeds. Live search is optional when YOUTUBE_API_KEY is set."""
    from app.config import get_settings

    rows = list(WELLNESS_VIDEOS)
    key = get_settings().youtube_api_key
    if key:
        try:
            import httpx

            params = {
                "part": "snippet",
                "q": "guided breathing exercise anxiety",
                "type": "video",
                "maxResults": 3,
                "key": key,
                "safeSearch": "strict",
            }
            async with httpx.AsyncClient(timeout=6) as client:
                res = await client.get("https://www.googleapis.com/youtube/v3/search", params=params)
            data = res.json()
            for item in data.get("items") or []:
                vid = (item.get("id") or {}).get("videoId")
                snippet = item.get("snippet") or {}
                if not vid:
                    continue
                rows.append(
                    {
                        "id": f"yt_{vid}",
                        "title": snippet.get("title") or "Wellness video",
                        "topic": "youtube",
                        "youtube_id": vid,
                        "embed": f"https://www.youtube.com/embed/{vid}",
                        "why": "Live YouTube search result.",
                        "source": "youtube_api",
                    }
                )
        except Exception:  # noqa: BLE001
            pass
    return {"videos": rows, "live": bool(key)}


@router.get("/partners/info")
async def partner_info():
    return {
        "therapist_fee_pct": 15,
        "chemist_fee_pct": 10,
        "payout_cycle": "weekly",
        "copy": {
            "therapist": "Join as a therapist. SoulCare keeps 15% of session fees to run matching, safety triage, and bookings.",
            "chemist": "Join as a chemist / medical store. SoulCare keeps 10% of catalog orders placed through the app.",
        },
    }


@router.post("/partners")
async def apply_partner(body: PartnerBody, user: dict = Depends(require_user)):
    existing = await store.collection("partners").find_one({"user_id": user["id"]})
    if existing:
        return _clean(existing)
    fee = 15 if body.role == "therapist" else 10
    doc = {
        "id": f"ptr_{uuid.uuid4().hex[:10]}",
        "user_id": user["id"],
        "role": body.role,
        "name": body.name.strip(),
        "email": body.email.strip().lower(),
        "city": body.city.strip(),
        "specialty": body.specialty.strip(),
        "notes": body.notes.strip()[:600],
        "platform_fee_pct": fee,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await store.collection("partners").insert_one(doc)
    return _clean(doc)


@router.get("/partners/me")
async def my_partner(user: dict = Depends(require_user)):
    row = await store.collection("partners").find_one({"user_id": user["id"]})
    if not row:
        return {"partner": None}
    bookings = await store.collection("bookings").find({"therapist_id": row.get("linked_therapist_id") or row["id"]})
    # also match by name
    extra = await store.collection("bookings").find({})
    mine = [b for b in extra if b.get("therapist_name") == row.get("name") or b.get("therapist_id") == row.get("linked_therapist_id")]
    notifs = await store.collection("partner_notifs").find(
        {"therapist_id": row.get("linked_therapist_id") or row["id"]},
        sort=[("created_at", -1)],
        limit=20,
    )
    slots = await store.collection("slots").find({"therapist_id": row.get("linked_therapist_id") or row["id"]})
    return {
        "partner": _clean(row),
        "bookings": [_clean(b) for b in mine or bookings],
        "notifications": [_clean(n) for n in notifs],
        "slots": [_clean(s) for s in slots],
    }


class PartnerAgreeBody(BaseModel):
    agreed: bool = True


@router.post("/partners/agree")
async def partner_agree(body: PartnerAgreeBody, user: dict = Depends(require_user)):
    row = await store.collection("partners").find_one({"user_id": user["id"]})
    if not row:
        raise HTTPException(status_code=404, detail="Apply as a partner first.")
    patch = {
        "status": "active" if body.agreed else "pending",
        "agreement_at": datetime.now(timezone.utc).isoformat(),
        "agreement": body.agreed,
    }
    if body.agreed and row.get("role") == "therapist" and not row.get("linked_therapist_id"):
        tid = f"th_ptr_{row['id'][-8:]}"
        await store.collection("therapists").insert_one(
            {
                "id": tid,
                "name": row.get("name"),
                "title": "Partner therapist",
                "city": row.get("city") or "India",
                "languages": ["English", "Hindi"],
                "tags": [t.strip() for t in (row.get("specialty") or "general").split(",") if t.strip()] or ["general"],
                "rating": 5.0,
                "reviews": 0,
                "price_inr": 1500,
                "years": 1,
                "bio": row.get("notes") or f"{row.get('name')} joined SoulCare as a partner therapist.",
                "approach": "Listed via partner agreement.",
                "photo_hue": 160,
                "partner_id": row["id"],
            }
        )
        patch["linked_therapist_id"] = tid
    await store.collection("partners").update_one({"id": row["id"]}, {"$set": patch})
    row.update(patch)
    return _clean(row)


class PartnerSlotBody(BaseModel):
    label: str
    starts_at: str | None = None


@router.post("/partners/slots")
async def partner_slot(body: PartnerSlotBody, user: dict = Depends(require_user)):
    row = await store.collection("partners").find_one({"user_id": user["id"]})
    if not row:
        raise HTTPException(status_code=404, detail="Apply as a partner first.")
    tid = row.get("linked_therapist_id") or row["id"]
    slot = {
        "id": f"{tid}_slot_{uuid.uuid4().hex[:6]}",
        "therapist_id": tid,
        "label": body.label,
        "starts_at": body.starts_at or datetime.now(timezone.utc).isoformat(),
        "taken": False,
    }
    await store.collection("slots").insert_one(slot)
    return _clean(slot)


@router.post("/phone/pickup")
async def phone_pickup(body: PhoneBody, user: dict = Depends(require_user)):
    today = date.today().isoformat()
    doc = {
        "id": f"phn_{uuid.uuid4().hex[:10]}",
        "user_id": user["id"],
        "source": body.source,
        "day": today,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await store.collection("phone_pickups").insert_one(doc)
    count = await store.collection("phone_pickups").count({"user_id": user["id"], "day": today})
    return {"ok": True, "today": count}


@router.get("/phone/today")
async def phone_today(user: dict = Depends(require_user)):
    today = date.today().isoformat()
    count = await store.collection("phone_pickups").count({"user_id": user["id"], "day": today})
    return {"day": today, "count": count}


@router.post("/food/scan")
async def food_scan(body: FoodScanBody, user: dict = Depends(require_user)):
    """Demo calorie estimate from a filename or typed hint — not medical-grade vision."""
    blob = f"{body.filename} {body.hint}".lower()
    foods = await store.collection("foods").find({})
    match = None
    for food in foods:
        name = (food.get("name") or "").lower()
        token = name.split()[0]
        if token and token in blob:
            match = food
            break
        if any(tag in blob for tag in food.get("tags") or []):
            match = food
            break
    if not match:
        # gentle fallback so scanning always returns something useful
        match = {
            "id": "food_unknown",
            "name": body.hint.strip() or "Homemade plate",
            "kcal": 280,
            "tags": ["estimate"],
        }
    return {
        "name": match.get("name"),
        "kcal": match.get("kcal"),
        "confidence": "demo",
        "note": "Photo calories are a lookup estimate, not lab analysis.",
        "food_id": match.get("id"),
        "user_id": user["id"],
    }


@router.post("/community/friends")
async def add_friend(body: FriendBody, user: dict = Depends(require_user)):
    friends = list(user.get("friends") or [])
    alias = body.alias.strip()
    if alias not in friends:
        friends.append(alias)
        await store.collection("users").update_one({"id": user["id"]}, {"$set": {"friends": friends}})
    return {"friends": friends}


@router.get("/community/friends")
async def list_friends(user: dict = Depends(require_user)):
    return {"friends": user.get("friends") or []}




