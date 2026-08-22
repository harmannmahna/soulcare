"""Notify a partner NGO on red-tier events. Never send raw chat text."""

from __future__ import annotations

from datetime import datetime, timezone

import httpx

from app.config import get_settings
from app.store import store

PARTNER_NGO = {
    "id": "ngo_icall",
    "name": "iCALL (TISS) — demo partner desk",
    "specialty": "counselling / crisis routing",
    "contact": "9152987821",
    "channel_label": "partner NGO ops",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def safety_copy(ngo_name: str) -> str:
    return (
        "You're not alone, and this moment can get safer.\n\n"
        "I'm not going to continue this as a normal conversation. "
        f"Your message has been flagged as high priority. We've alerted {ngo_name} — "
        "a responder will follow up. Meanwhile, please call 112 or Tele-MANAS 14416.\n\n"
        "• India Emergency — 112\n"
        "• Tele-MANAS mental health helpline — 14416\n\n"
        "If you can, stay with someone you trust or go to the nearest hospital emergency desk."
    )


async def notify_red(*, session_id: str, user_id: str | None, event_id: str, triggered_rule: str | None) -> dict:
    settings = get_settings()
    ts = _now()
    payload = {
        "text": (
            f"[SoulCare RED] session={session_id} event={event_id} "
            f"rule={triggered_rule or 'unspecified'} at {ts}. No chat transcript attached."
        )
    }
    channel = None
    detail = None

    webhook = settings.slack_webhook_url
    if webhook:
        try:
            async with httpx.AsyncClient(timeout=6) as client:
                res = await client.post(webhook, json=payload)
            if res.status_code < 300:
                channel = "slack"
                detail = "slack_webhook"
        except Exception as exc:  # noqa: BLE001
            detail = f"slack_error:{exc.__class__.__name__}"

    if channel is None and settings.telegram_bot_token and settings.telegram_chat_id:
        try:
            url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
            async with httpx.AsyncClient(timeout=6) as client:
                res = await client.post(
                    url,
                    json={"chat_id": settings.telegram_chat_id, "text": payload["text"]},
                )
            if res.status_code < 300:
                channel = "telegram"
                detail = "telegram_bot"
        except Exception as rec:  # noqa: BLE001
            detail = f"telegram_error:{rec.__class__.__name__}"

    if channel is None and settings.resend_api_key and settings.ngo_alert_email:
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                res = await client.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {settings.resend_api_key}"},
                    json={
                        "from": "SoulCare Alerts <alerts@soulcare.app>",
                        "to": [settings.ngo_alert_email],
                        "subject": f"RED alert {session_id}",
                        "text": payload["text"],
                    },
                )
            if res.status_code < 300:
                channel = "resend"
                detail = "email"
        except Exception as rec:  # noqa: BLE001
            detail = f"resend_error:{rec.__class__.__name__}"

    if channel is None:
        channel = "ngo_inbox"
        detail = detail or "logged_local_partner_desk"

    record = {
        "id": event_id,
        "session_id": session_id,
        "user_id": user_id,
        "ngo": PARTNER_NGO,
        "channel": channel,
        "detail": detail,
        "notified_at": ts,
        "body": payload["text"],
    }
    await store.collection("ngo_inbox").insert_one(record)
    return {
        "notifiedChannel": channel,
        "notifiedAt": ts,
        "ngo_name": PARTNER_NGO["name"],
        "detail": detail,
    }
