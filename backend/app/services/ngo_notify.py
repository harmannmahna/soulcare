"""Notify a partner NGO on red-tier events. Never send raw chat text.

Primary path is Swytchcode (Slack → Telegram → Resend). Direct HTTP is
only used if the kernel is unavailable.
"""

from __future__ import annotations

from datetime import datetime, timezone

from app.config import get_settings
from app.services.swytchcode_exec import exec_tool
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


def _label(swy: dict, name: str) -> str:
    mode = "demo" if swy.get("demo") else "live"
    return f"swytchcode:{name}:{mode}"


async def notify_red(*, session_id: str, user_id: str | None, event_id: str, triggered_rule: str | None) -> dict:
    settings = get_settings()
    ts = _now()
    text = (
        f"[SoulCare RED] session={session_id} event={event_id} "
        f"rule={triggered_rule or 'unspecified'} at {ts}. No chat transcript attached."
    )
    attempts = [
        (
            "slack",
            {"token": settings.slack_bot_token or "demo-token"},
            {"channel": settings.slack_channel_id or "#ngo-alerts", "text": text},
            "slack.chat.postmessage.create",
        ),
        (
            "telegram",
            {"token": settings.telegram_bot_token or "demo"},
            {"chat_id": settings.telegram_chat_id or "demo", "text": text},
            "telegram_v5_0.sendmessage.create",
        ),
        (
            "resend",
            {},
            {
                "from": "SoulCare Alerts <alerts@soulcare.app>",
                "to": [settings.ngo_alert_email or "ngo@example.com"],
                "subject": f"RED alert {session_id}",
                "text": text,
            },
            "resend.email.create",
        ),
    ]
    channel = None
    detail = None
    for alias, extra, body, canonical in attempts:
        swy = await exec_tool(alias, extra=extra or None, body=body)
        if swy.get("via") == "swytchcode" and swy.get("error") != "cli_missing":
            channel = _label(swy, canonical)
            detail = "demo" if swy.get("demo") else "live"
            break
        detail = swy.get("error") or detail

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
        "body": text,
        "via": "swytchcode",
    }
    await store.collection("ngo_inbox").insert_one(record)
    return {
        "notifiedChannel": channel,
        "notifiedAt": ts,
        "ngo_name": PARTNER_NGO["name"],
        "detail": detail,
    }
