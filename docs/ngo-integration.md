# NGO integration (demo scope)

SoulCare notifies a **single partner desk** on every red-tier event. The current demo partner is **iCALL (TISS)** — a well-known Indian counselling helpline used here as a stand-in NGO operations channel.

## What is sent

The payload includes:

- session ID
- risk-event ID
- triggered rule name
- UTC timestamp

**Never** raw chat text, names beyond the opaque user id already on the session, or model logits.

## Channels (first success wins)

1. `SLACK_WEBHOOK_URL` — incoming webhook to a “partner NGO” Slack channel
2. `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` — Telegram bot message
3. `RESEND_API_KEY` + `NGO_ALERT_EMAIL` — email via Resend
4. If none are configured, the event is still **logged** to `ngo_inbox` and shown in admin (`GET /api/v1/admin/ngo-inbox`) so the demo never silently drops a red alert

The user-facing safety copy names the partner and keeps 112 / Tele-MANAS 14416. Admin alert cards show **NGO Notified ✓** with channel + timestamp.

## What a production rollout would need

- Formal data-sharing and crisis-routing agreements with each NGO (DPDP / clinical governance, not a webhook in `.env`)
- Verified 24×7 contact routing (on-call rota, bilingual staff, city-level escalation)
- Delivery receipts and retry with a human fallback if Slack/Telegram/email fail
- Separate legal basis for any PII beyond session identifiers
- Load-tested rate limits so a flood of red events cannot overwhelm a partner inbox
- Regional partners (not a single national desk) and a way for the user to opt into follow-up

This demo is intentionally one partner and one channel so judges can watch a real message land without pretending the clinical network is complete.
