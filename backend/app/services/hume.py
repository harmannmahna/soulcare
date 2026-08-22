"""Hume Expression Measurement — transcript + vocal emotions. No audio persistence."""
from __future__ import annotations

import asyncio
import base64
import json
import logging
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger("soulcare.hume")

HUME_JOBS = "https://api.hume.ai/v0/batch/jobs"
DISTRESS_FOCUS = (
    "Distress",
    "Anxiety",
    "Fear",
    "Sadness",
    "Horror",
    "Pain",
    "Anguish",
    "Despair",
    "Grief",
)


async def _access_token() -> str | None:
    settings = get_settings()
    if not settings.hume_api_key or not settings.hume_secret_key:
        return None
    raw = f"{settings.hume_api_key}:{settings.hume_secret_key}".encode()
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.post(
                "https://api.hume.ai/oauth2-cc/token",
                headers={"Authorization": f"Basic {base64.b64encode(raw).decode()}"},
                data={"grant_type": "client_credentials"},
            )
            if res.status_code >= 400:
                return None
            return (res.json() or {}).get("access_token")
    except Exception as exc:  # noqa: BLE001
        logger.warning("Hume OAuth failed: %s", exc)
        return None


def _headers(token: str | None) -> dict[str, str]:
    settings = get_settings()
    if token:
        return {"Authorization": f"Bearer {token}"}
    return {"X-Hume-Api-Key": settings.hume_api_key}


def _collect_emotions(node: Any, bucket: list[dict]) -> None:
    if isinstance(node, dict):
        emotions = node.get("emotions")
        if isinstance(emotions, list):
            bucket.extend(e for e in emotions if isinstance(e, dict))
        text = node.get("text")
        if isinstance(text, str) and text.strip():
            node["_sc_text"] = text.strip()
        for value in node.values():
            _collect_emotions(value, bucket)
    elif isinstance(node, list):
        for item in node:
            _collect_emotions(item, bucket)


def _collect_text(node: Any, parts: list[str]) -> None:
    if isinstance(node, dict):
        text = node.get("text")
        if isinstance(text, str) and text.strip():
            parts.append(text.strip())
        for value in node.values():
            _collect_text(value, parts)
    elif isinstance(node, list):
        for item in node:
            _collect_text(item, parts)


def parse_hume_payload(payload: Any) -> dict:
    emotions: list[dict] = []
    texts: list[str] = []
    _collect_emotions(payload, emotions)
    _collect_text(payload, texts)
    # Deduplicate nearby transcript fragments while keeping order.
    seen: set[str] = set()
    unique_text: list[str] = []
    for chunk in texts:
        if chunk not in seen:
            seen.add(chunk)
            unique_text.append(chunk)
    transcript = " ".join(unique_text).strip()
    from app.services.avatar_risk import vocal_score_from_emotions

    score = vocal_score_from_emotions(emotions)
    top = sorted(emotions, key=lambda e: float(e.get("score") or 0), reverse=True)[:5]
    return {
        "ok": True,
        "transcript": transcript,
        "vocal_score": score,
        "emotions": [{"name": e.get("name"), "score": e.get("score")} for e in top],
        "backend": "hume",
    }


async def analyze_audio(
    audio: bytes,
    *,
    filename: str = "turn.webm",
    content_type: str = "audio/webm",
    timeout_s: float = 18.0,
) -> dict:
    settings = get_settings()
    if not settings.hume_api_key:
        return {"ok": False, "error": "Hume is not configured.", "transcript": "", "vocal_score": None}
    if not audio:
        return {"ok": False, "error": "Empty audio.", "transcript": "", "vocal_score": None}

    token = await _access_token()
    headers = _headers(token)
    models = {"models": {"prosody": {}, "language": {}}, "transcription": {"language": None}}
    files = {
        "file": (filename, audio, content_type or "application/octet-stream"),
        "json": (None, json.dumps(models), "application/json"),
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            started = await client.post(HUME_JOBS, headers=headers, files=files)
            if started.status_code == 401 and token is None:
                token = await _access_token()
                if token:
                    started = await client.post(HUME_JOBS, headers=_headers(token), files=files)
            started.raise_for_status()
            job_id = (started.json() or {}).get("job_id") or (started.json() or {}).get("jobId")
            if not job_id:
                return {"ok": False, "error": "Hume did not return a job id.", "transcript": "", "vocal_score": None}

            elapsed = 0.0
            while elapsed < timeout_s:
                await asyncio.sleep(0.8)
                elapsed += 0.8
                status = await client.get(f"{HUME_JOBS}/{job_id}", headers=_headers(token))
                status.raise_for_status()
                state = ((status.json() or {}).get("state") or {}).get("status") or (status.json() or {}).get("status")
                if str(state).upper() in {"COMPLETED", "COMPLETE", "SUCCESS"}:
                    preds = await client.get(f"{HUME_JOBS}/{job_id}/predictions", headers=_headers(token))
                    preds.raise_for_status()
                    parsed = parse_hume_payload(preds.json())
                    parsed["job_id"] = job_id
                    return parsed
                if str(state).upper() in {"FAILED", "ERROR", "REJECTED"}:
                    return {"ok": False, "error": f"Hume job {state}", "transcript": "", "vocal_score": None}
            return {"ok": False, "error": "Hume timed out.", "transcript": "", "vocal_score": None}
    except Exception as exc:  # noqa: BLE001
        logger.warning("Hume analyze failed: %s", exc)
        return {"ok": False, "error": "Hume request failed.", "transcript": "", "vocal_score": None}
