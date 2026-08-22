from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.deps import require_user
from app.store import store

router = APIRouter(tags=["journey"])


class CheckinBody(BaseModel):
    mood: int = Field(ge=1, le=5)
    sleep_hours: float = Field(ge=0, le=24)
    hydration: int = Field(ge=0, le=20)
    note: str = ""


class HabitBody(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    kind: str = "start"
    color: str = "#4A7C6A"


class HabitCompleteBody(BaseModel):
    date: str | None = None
    done: bool = True


class FoodBody(BaseModel):
    food_id: str | None = None
    name: str | None = None
    kcal: int | None = None
    note: str = ""


class CycleBody(BaseModel):
    last_start: str
    last_end: str | None = None
    cycle_length: int = 28
    period_length: int = 5


class CommunityBody(BaseModel):
    body: str = Field(min_length=4, max_length=600)
    alias: str | None = None


def _clean(doc: dict | None) -> dict | None:
    if not doc:
        return None
    doc.pop("_id", None)
    return doc


def _today() -> str:
    return date.today().isoformat()


def _streak(log: list[dict]) -> int:
    days = {row["date"] for row in log if row.get("done")}
    streak = 0
    cursor = date.today()
    while cursor.isoformat() in days:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


def _habit_score(habits: list[dict], window: int = 7) -> int:
    if not habits:
        return 0
    start = date.today() - timedelta(days=window - 1)
    scores = []
    for habit in habits:
        done = 0
        for i in range(window):
            day = (start + timedelta(days=i)).isoformat()
            if any(row.get("date") == day and row.get("done") for row in habit.get("log") or []):
                done += 1
        scores.append(done / window)
    return int(round(100 * (sum(scores) / len(scores))))


@router.post("/journey/checkins")
async def create_checkin(body: CheckinBody, user: dict = Depends(require_user)):
    doc = {
        "id": f"chk_{uuid.uuid4().hex[:10]}",
        "user_id": user["id"],
        "mood": body.mood,
        "sleep_hours": body.sleep_hours,
        "hydration": body.hydration,
        "note": body.note[:400],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await store.collection("checkins").insert_one(doc)
    return _clean(doc)


@router.get("/journey/checkins")
async def list_checkins(user: dict = Depends(require_user)):
    rows = await store.collection("checkins").find({"user_id": user["id"]}, sort=[("created_at", -1)], limit=60)
    return [_clean(r) for r in rows]


@router.get("/journey/weekly")
async def weekly_summary(user: dict = Depends(require_user)):
    rows = await store.collection("checkins").find({"user_id": user["id"]}, sort=[("created_at", 1)])
    cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    week = [r for r in rows if (r.get("created_at") or "") >= cutoff]
    if not week:
        return {"days": 0, "avg_mood": 0, "avg_sleep": 0, "avg_hydration": 0, "points": []}
    return {
        "days": len(week),
        "avg_mood": round(sum(r["mood"] for r in week) / len(week), 2),
        "avg_sleep": round(sum(r["sleep_hours"] for r in week) / len(week), 2),
        "avg_hydration": round(sum(r["hydration"] for r in week) / len(week), 2),
        "points": [
            {
                "date": (r.get("created_at") or "")[:10],
                "mood": r["mood"],
                "sleep_hours": r["sleep_hours"],
                "hydration": r["hydration"],
            }
            for r in week
        ],
    }


@router.get("/habits")
async def list_habits(tab: str = "all", user: dict = Depends(require_user)):
    rows = await store.collection("habits").find({"user_id": user["id"]})
    today = _today()
    out = []
    for row in rows:
        if not row.get("active", True):
            continue
        due = not any(x.get("date") == today and x.get("done") for x in row.get("log") or [])
        if tab == "due" and not due:
            continue
        item = _clean(row)
        item["streak"] = _streak(row.get("log") or [])
        item["due"] = due
        out.append(item)
    return out


@router.post("/habits")
async def create_habit(body: HabitBody, user: dict = Depends(require_user)):
    doc = {
        "id": f"hab_{uuid.uuid4().hex[:10]}",
        "user_id": user["id"],
        "name": body.name.strip(),
        "kind": body.kind,
        "color": body.color,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "active": True,
        "log": [],
    }
    await store.collection("habits").insert_one(doc)
    return {**_clean(doc), "streak": 0, "due": True}


@router.post("/habits/{habit_id}/complete")
async def complete_habit(habit_id: str, body: HabitCompleteBody, user: dict = Depends(require_user)):
    habit = await store.collection("habits").find_one({"id": habit_id, "user_id": user["id"]})
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    day = body.date or _today()
    log = [row for row in (habit.get("log") or []) if row.get("date") != day]
    log.append({"date": day, "done": body.done})
    await store.collection("habits").update_one({"id": habit_id}, {"$set": {"log": log}})
    habit["log"] = log
    return {**_clean(habit), "streak": _streak(log), "due": not body.done}


@router.get("/habits/score")
async def habit_score(user: dict = Depends(require_user)):
    rows = await store.collection("habits").find({"user_id": user["id"]})
    active = [r for r in rows if r.get("active", True)]
    return {"score": _habit_score(active), "active": len(active)}


@router.get("/habits/{habit_id}/week")
async def habit_week(habit_id: str, user: dict = Depends(require_user)):
    habit = await store.collection("habits").find_one({"id": habit_id, "user_id": user["id"]})
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    today = date.today()
    start = today - timedelta(days=(today.weekday() + 1) % 7)  # Sunday
    days = []
    for i in range(7):
        d = start + timedelta(days=i)
        days.append(
            {
                "date": d.isoformat(),
                "label": d.strftime("%a"),
                "done": any(x.get("date") == d.isoformat() and x.get("done") for x in habit.get("log") or []),
            }
        )
    return {"habit": _clean(habit), "week": days}


@router.get("/journey/board")
async def journey_board(user: dict = Depends(require_user)):
    checkins = await store.collection("checkins").find({"user_id": user["id"]}, sort=[("created_at", -1)], limit=14)
    habits = await store.collection("habits").find({"user_id": user["id"]})
    active = [h for h in habits if h.get("active", True)]
    weekly = await weekly_summary(user)
    today = date.today()
    start = today - timedelta(days=(today.weekday() + 1) % 7)
    rings = []
    for i in range(7):
        d = start + timedelta(days=i)
        if not active:
            pct = 0
        else:
            done = 0
            for habit in active:
                if any(x.get("date") == d.isoformat() and x.get("done") for x in habit.get("log") or []):
                    done += 1
            pct = int(round(100 * done / len(active)))
        rings.append({"date": d.isoformat(), "label": d.strftime("%a"), "pct": pct})
    return {
        "habit_score": _habit_score(active),
        "rings": rings,
        "habits": [
            {**_clean(h), "streak": _streak(h.get("log") or [])} for h in active
        ],
        "checkins": [_clean(c) for c in checkins],
        "weekly": weekly,
    }


@router.get("/food")
async def food_catalog(q: str | None = None):
    rows = await store.collection("foods").find({})
    if q:
        needle = q.lower()
        rows = [r for r in rows if needle in r.get("name", "").lower()]
    return [_clean(r) for r in rows]


@router.post("/food/log")
async def log_food(body: FoodBody, user: dict = Depends(require_user)):
    name = body.name
    kcal = body.kcal
    if body.food_id:
        food = await store.collection("foods").find_one({"id": body.food_id})
        if food:
            name = food["name"]
            kcal = food["kcal"]
    if not name or kcal is None:
        raise HTTPException(status_code=400, detail="Pick a food or enter name + calories.")
    doc = {
        "id": f"food_{uuid.uuid4().hex[:10]}",
        "user_id": user["id"],
        "name": name,
        "kcal": kcal,
        "note": body.note,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await store.collection("food_logs").insert_one(doc)
    return _clean(doc)


@router.get("/food/log")
async def list_food(user: dict = Depends(require_user)):
    rows = await store.collection("food_logs").find({"user_id": user["id"]}, sort=[("created_at", -1)], limit=30)
    return [_clean(r) for r in rows]


@router.get("/period")
async def get_period(user: dict = Depends(require_user)):
    row = await store.collection("cycles").find_one({"user_id": user["id"]})
    if not row:
        return {"tracked": False}
    start = date.fromisoformat(row["last_start"])
    length = int(row.get("cycle_length") or 28)
    next_start = start + timedelta(days=length)
    return {
        "tracked": True,
        **_clean(row),
        "next_start": next_start.isoformat(),
        "day_in_cycle": (date.today() - start).days + 1,
    }


@router.post("/period")
async def upsert_period(body: CycleBody, user: dict = Depends(require_user)):
    doc = {
        "id": f"cyc_{user['id']}",
        "user_id": user["id"],
        **body.model_dump(),
    }
    existing = await store.collection("cycles").find_one({"user_id": user["id"]})
    if existing:
        await store.collection("cycles").update_one({"user_id": user["id"]}, {"$set": doc})
    else:
        await store.collection("cycles").insert_one(doc)
    return await get_period(user)


_BLOCKED = ("kill yourself", "hate you", "kys", "slur")


@router.get("/community")
async def community_feed():
    rows = await store.collection("community").find({}, sort=[("created_at", -1)], limit=40)
    return [_clean(r) for r in rows]


@router.post("/community")
async def community_post(body: CommunityBody, user: dict = Depends(require_user)):
    lowered = body.body.lower()
    if any(term in lowered for term in _BLOCKED):
        raise HTTPException(status_code=400, detail="This space is supportive-only. Please rephrase.")
    doc = {
        "id": f"com_{uuid.uuid4().hex[:10]}",
        "alias": (body.alias or "soft-leaf").strip()[:24],
        "body": body.body.strip(),
        "user_id": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await store.collection("community").insert_one(doc)
    return _clean(doc)


@router.get("/nudges")
async def nudges(user: dict = Depends(require_user)):
    now = datetime.now().strftime("%H:%M")
    bedtime = user.get("bedtime") or "23:00"
    night = now >= bedtime
    focus = user.get("focus_hours") or "10:00-13:00"
    in_focus = False
    if "-" in focus:
        start, end = focus.split("-", 1)
        in_focus = start <= now <= end
    return {
        "bedtime": bedtime,
        "night_winddown": night,
        "focus_hours": focus,
        "focus_nudge": in_focus,
        "mood_prompt": True,
    }
