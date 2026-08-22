from __future__ import annotations

from fastapi import Header, HTTPException

from app.security import bearer_payload
from app.store import store


async def optional_user(authorization: str | None = Header(default=None)) -> dict | None:
    if not authorization:
        return None
    payload = bearer_payload(authorization)
    user = await store.collection("users").find_one({"id": payload.get("sub")})
    if not user:
        return {
            "id": payload.get("sub"),
            "guest": bool(payload.get("guest")),
            "name": "Guest",
            "language": "en",
            "consent": False,
        }
    user.pop("password_hash", None)
    user.pop("_id", None)
    return user


async def require_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization:
        raise HTTPException(status_code=401, detail="Sign in or continue as guest first.")
    user = await optional_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unknown session")
    return user


def public_user(user: dict) -> dict:
    return {
        "id": user.get("id"),
        "email": user.get("email"),
        "name": user.get("name"),
        "guest": bool(user.get("guest")),
        "language": user.get("language") or "en",
        "bedtime": user.get("bedtime"),
        "focus_hours": user.get("focus_hours"),
        "consent": bool(user.get("consent")),
        "saved_resources": user.get("saved_resources") or [],
    }
