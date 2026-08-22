from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field

from app.deps import public_user, require_user
from app.security import create_token, hash_password, verify_password
from app.services.pipeline import transfer_sessions
from app.store import store

router = APIRouter(prefix="/auth", tags=["auth"])


class SignupBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=80)
    language: str = "en"


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class GuestBody(BaseModel):
    language: str = "en"


class UpgradeBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=80)


class ProfileBody(BaseModel):
    name: str | None = None
    language: str | None = None
    bedtime: str | None = None
    focus_hours: str | None = None
    gender: str | None = None
    age: int | None = Field(default=None, ge=13, le=120)
    weight: float | None = Field(default=None, gt=0, le=400)
    height: float | None = Field(default=None, gt=0, le=280)
    details_completed: bool | None = None
    avatar: str | None = None


class DetailsBody(BaseModel):
    gender: str = Field(min_length=1, max_length=24)
    age: int = Field(ge=13, le=120)
    weight: float = Field(gt=0, le=400)
    height: float = Field(gt=0, le=280)
    consent: bool = True


class ConsentBody(BaseModel):
    accepted: bool


def _uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


@router.post("/signup")
async def signup(body: SignupBody):
    users = store.collection("users")
    if await users.find_one({"email": body.email.lower()}):
        raise HTTPException(status_code=409, detail="An account with that email already exists.")
    user = {
        "id": _uid("usr"),
        "email": body.email.lower(),
        "name": body.name.strip(),
        "password_hash": hash_password(body.password),
        "guest": False,
        "language": body.language,
        "bedtime": "23:00",
        "focus_hours": "10:00-13:00",
        "consent": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "saved_resources": [],
        "gender": None,
        "age": None,
        "weight": None,
        "height": None,
        "details_completed": False,
        "focus_points": 0,
        "room_items": [],
        "friends": [],
    }
    await users.insert_one(user)
    return {"token": create_token(user["id"], guest=False), "user": public_user(user)}


@router.post("/login")
async def login(body: LoginBody):
    user = await store.collection("users").find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user.get("password_hash") or ""):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")
    return {"token": create_token(user["id"], guest=bool(user.get("guest"))), "user": public_user(user)}


@router.post("/guest")
async def guest(body: GuestBody):
    user = {
        "id": _uid("gst"),
        "email": None,
        "name": "Guest",
        "password_hash": None,
        "guest": True,
        "language": body.language,
        "bedtime": "23:00",
        "focus_hours": "10:00-13:00",
        "consent": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "saved_resources": [],
        "gender": None,
        "age": None,
        "weight": None,
        "height": None,
        "details_completed": False,
        "focus_points": 0,
        "room_items": [],
        "friends": [],
    }
    await store.collection("users").insert_one(user)
    return {"token": create_token(user["id"], guest=True), "user": public_user(user)}


@router.post("/upgrade")
async def upgrade(body: UpgradeBody, current: dict = Depends(require_user)):
    if not current.get("guest"):
        raise HTTPException(status_code=400, detail="This account is already upgraded.")
    if await store.collection("users").find_one({"email": body.email.lower()}):
        raise HTTPException(status_code=409, detail="An account with that email already exists.")
    patch = {
        "email": body.email.lower(),
        "name": body.name.strip(),
        "password_hash": hash_password(body.password),
        "guest": False,
    }
    await store.collection("users").update_one({"id": current["id"]}, {"$set": patch})
    current.update(patch)
    return {"token": create_token(current["id"], guest=False), "user": public_user(current)}


@router.post("/claim")
async def claim_guest(body: UpgradeBody, current: dict = Depends(require_user)):
    """Create a real account and move guest journey history across."""
    if not current.get("guest"):
        raise HTTPException(status_code=400, detail="Already a full account.")
    if await store.collection("users").find_one({"email": body.email.lower()}):
        raise HTTPException(status_code=409, detail="An account with that email already exists.")
    new_id = _uid("usr")
    user = {
        "id": new_id,
        "email": body.email.lower(),
        "name": body.name.strip(),
        "password_hash": hash_password(body.password),
        "guest": False,
        "language": current.get("language") or "en",
        "bedtime": current.get("bedtime") or "23:00",
        "focus_hours": current.get("focus_hours") or "10:00-13:00",
        "consent": bool(current.get("consent")),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "saved_resources": current.get("saved_resources") or [],
    }
    await store.collection("users").insert_one(user)
    await transfer_sessions(current["id"], new_id)
    return {"token": create_token(new_id, guest=False), "user": public_user(user)}


@router.get("/me")
async def me(user: dict = Depends(require_user)):
    return public_user(user)


@router.patch("/me")
async def update_me(body: ProfileBody, user: dict = Depends(require_user)):
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    if "gender" in patch:
        patch["gender"] = str(patch["gender"]).strip().lower()
    if patch:
        await store.collection("users").update_one({"id": user["id"]}, {"$set": patch})
        user.update(patch)
    return public_user(user)


@router.post("/details")
async def save_details(body: DetailsBody, user: dict = Depends(require_user)):
    patch = {
        "gender": body.gender.strip().lower(),
        "age": body.age,
        "weight": body.weight,
        "height": body.height,
        "details_completed": True,
        "consent": bool(body.consent),
        "consent_at": datetime.now(timezone.utc).isoformat(),
    }
    await store.collection("users").update_one({"id": user["id"]}, {"$set": patch})
    user.update(patch)
    return public_user(user)


@router.post("/consent")
async def consent(body: ConsentBody, user: dict = Depends(require_user)):
    await store.collection("users").update_one(
        {"id": user["id"]},
        {"$set": {"consent": body.accepted, "consent_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"ok": True, "consent": body.accepted}
