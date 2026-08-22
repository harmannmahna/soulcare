"""D-ID talking-head clips. No raw user audio is sent here — only companion text."""
from __future__ import annotations

import asyncio
import base64
import logging

import httpx

from app.config import get_settings

logger = logging.getLogger("soulcare.did")

DID_TALKS = "https://api.d-id.com/talks"


def presenter_url() -> str:
    return get_settings().d_id_presenter_url or "https://d-id-public-bucket.s3.amazonaws.com/or-roman.jpg"


def _auth_header() -> str:
    key = (get_settings().d_id_api_key or "").strip()
    if not key:
        return ""
    # D-ID expects Basic <base64(api_key)>. Keys are often already username:password.
    token = base64.b64encode(key.encode()).decode()
    return f"Basic {token}"


async def create_talk(text: str, timeout_s: float = 24.0) -> dict:
    settings = get_settings()
    if not settings.d_id_api_key:
        return {"ok": False, "error": "D-ID is not configured."}
    script = (text or "").strip()
    if not script:
        return {"ok": False, "error": "Empty script."}

    headers = {
        "Authorization": _auth_header(),
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    body = {
        "source_url": presenter_url(),
        "script": {
            "type": "text",
            "input": script[:900],
            "provider": {"type": "microsoft", "voice_id": "en-US-JennyNeural"},
        },
        "config": {"stitch": True, "fluent": True, "pad_audio": 0.0},
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            created = await client.post(DID_TALKS, headers=headers, json=body)
            if created.status_code >= 400:
                logger.warning("D-ID create failed: %s %s", created.status_code, created.text[:240])
                return {"ok": False, "error": "D-ID could not start a talk."}
            talk_id = (created.json() or {}).get("id")
            if not talk_id:
                return {"ok": False, "error": "D-ID did not return a talk id."}

            elapsed = 0.0
            while elapsed < timeout_s:
                await asyncio.sleep(1.0)
                elapsed += 1.0
                poll = await client.get(f"{DID_TALKS}/{talk_id}", headers=headers)
                if poll.status_code >= 400:
                    continue
                data = poll.json() or {}
                status = str(data.get("status") or "")
                if status == "done" and data.get("result_url"):
                    return {
                        "ok": True,
                        "talk_id": talk_id,
                        "video_url": data["result_url"],
                        "duration": data.get("duration"),
                        "presenter_url": presenter_url(),
                    }
                if status in {"error", "rejected"}:
                    return {"ok": False, "error": data.get("error", {}).get("description") or "D-ID talk failed."}
            return {"ok": False, "error": "D-ID timed out."}
    except Exception as exc:  # noqa: BLE001
        logger.warning("D-ID request failed: %s", exc)
        return {"ok": False, "error": "D-ID request failed."}
