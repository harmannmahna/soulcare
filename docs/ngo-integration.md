# NGO integration (demo scope)

SoulCare notifies a **single partner desk** on every red-tier event. The current demo partner is **iCALL (TISS)** — a well-known Indian counselling helpline used here as a stand-in NGO operations channel.

Delivery always goes through the **Swytchcode kernel** (`swytchcode exec`), not a raw webhook SDK.

## What is sent

The payload includes:

- session ID
- risk-event ID
- triggered rule name
- UTC timestamp

**Never** raw chat text, names beyond the opaque user id already on the session, or model logits.

## Channels (first Swytchcode success wins)

1. `slack.chat.postmessage.create` — Slack **bot token** + channel id (`SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID`)
2. `telegram_v5_0.sendmessage.create` — Telegram bot (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`)
3. `resend.email.create` — email (`RESEND_API_KEY`, `NGO_ALERT_EMAIL`)
4. If the CLI is missing, the event is still **logged** to `ngo_inbox` and shown in admin (`GET /api/v1/admin/ngo-inbox`) so the demo never silently drops a red alert

`notifiedChannel` looks like `swytchcode:slack.chat.postmessage.create:demo` or `:live`.

With `SWYTCHCODE_DEMO=true` (default) the kernel is invoked with `--demo`. Slack currently has no hosted demo fixture; the CLI still runs and the inbox record is written. For a live Slack ping in the pitch: `swytchcode login`, `swytchcode auth connect slack`, set `SWYTCHCODE_DEMO=false` plus bot token + channel, restart the API.

The user-facing safety copy names the partner and keeps 112 / Tele-MANAS 14416. Admin alert cards show **NGO Notified ✓** with channel + timestamp.

Setup: `docs/swytchcode-setup.md`.

## What a production rollout would need

- Formal data-sharing and crisis-routing agreements with each NGO (DPDP / clinical governance, not a token in `.env`)
- Verified 24×7 contact routing (on-call rota, bilingual staff, city-level escalation)
- Delivery receipts and retry with a human fallback if Slack/Telegram/email fail
- Separate legal basis for any PII beyond session identifiers
- Load-tested rate limits so a flood of red events cannot overwhelm a partner inbox
- Regional partners (not a single national desk) and a way for the user to opt into follow-up

This demo is intentionally one partner and one channel so judges can watch a real message land without pretending the clinical network is complete.
