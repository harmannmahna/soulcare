# SoulCare

A safety-first holistic health platform: mental support, physical/lifestyle tracking, and crisis escalation in one app.

Every user message — text or transcribed voice — is **risk-classified on the server before any AI reply**. Red-tier (self-harm / crisis) language **never reaches an LLM**. Classification is a **hybrid**: a fine-tuned classifier plus a keyword/phrase rail. If **either** flags red, the turn is red. The user sees a fixed safety script, India’s emergency numbers (**112**, **Tele-MANAS 14416**), a partner NGO is notified, and admins get a live WebSocket alert.

## What’s real vs demo

**Fully real**
- Green / yellow / red risk triage (English + Hinglish) — hybrid **sklearn TF-IDF + logistic regression** artifact with a keyword **OR-red** safety rail (Qwen2.5-0.5B LoRA training script included for Colab)
- Guest + JWT auth, consent gate
- Therapist directory with **embedding similarity ranking** (Weaviate when `WEAVIATE_URL` is set, else local TF-IDF cosine) plus tag-filter fallback
- Booking IDs, partner notifications, **Google Calendar** template URL on confirm
- Resources, daily check-ins, custom habits / streaks / habit score
- Admin session monitor + `/ws/admin` red alerts with model confidence and NGO-notified badges
- Red-tier **NGO notify** (Slack webhook, Telegram, or Resend; otherwise logged to admin `ngo_inbox`)
- Chat **session list + New chat** (summaries only — no long-term raw transcripts)
- Period tracker calendar, cycle prediction, optional symptom tags (female profiles)
- Recurring check-in popups (timer + inactivity + post-yellow)
- Pharmacy finder with realistic city listings + distance sort when geolocation is allowed
- User / Admin / B2B dashboards as separate routes; therapist/chemist partner desk

**Demo / mocked**
- Prescription metadata (not a medical record store)
- Counsellor takeover (UI + mocked queue)
- Community moderation (keyword-only)
- Calorie logging (lookup table, not photo vision)
- B2B `/b2b-demo` numbers (aggregate sample, not live campus data)
- Firecrawl / YouTube Data API / Cloudinary only when those keys are set

## Stack

| Layer | Tech |
| --- | --- |
| API | FastAPI, Motor/PyMongo, JWT, in-memory rate limit |
| AI | Gemini with model failover, **MockAI** when `DEMO_MODE=true` or no key |
| Risk ML | Qwen2.5-0.5B LoRA (Colab) **or** sklearn TF-IDF + LogReg runtime artifact |
| Matching | Weaviate near-text, local TF-IDF fallback |
| Alerts | Slack / Telegram / Resend + `/ws/admin` |
| Web | React + Vite + Tailwind, Framer Motion, GSAP, React Three Fiber |
| Data | MongoDB, with an in-memory fallback if Mongo is down |
| Deploy | Render (`render.yaml`) + Vercel (`frontend/vercel.json`) |

## Quick start

```bash
# API (works without Mongo — uses in-memory seed data)
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# optional: retrain the runtime classifier
python ml/train_sklearn.py
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Web
cd frontend
npm install
npm run dev
```

Optional local Mongo:

```bash
docker compose up mongo
```

Demo account: `demo@soulcare.app` / `Demo@123`  
Admin header: `X-Admin-Token: soulcare-admin-demo`

## Safety pipeline

`backend/app/services/risk_triage.py` is isolated on purpose:

1. Classify the utterance with **keywords and the ML model**. Keyword red always wins; the model cannot downgrade a crisis phrase.
2. Persist **only** session + risk metadata (tier, rule, action, model confidence, NGO notify fields, timestamp). Raw chat is not stored long-term.
3. **Red:** return the fixed script (names the partner NGO), broadcast `/ws/admin`, notify Slack/Telegram/email, **do not call Gemini**.
4. **Yellow:** companion reply + ranked therapists (vector similarity + match reason). A gentler check-in popup may follow.
5. **Green:** companion reply only.

Prompt injection cannot bypass the keyword rail: that matcher does not consult an LLM.

Metrics: `GET /api/v1/model_metrics` and `docs/model-metrics.md`.

NGO scope: `docs/ngo-integration.md`.

## Environment

See `backend/.env.example`. Never commit secrets.

| Variable | Purpose |
| --- | --- |
| `DEMO_MODE` | Forces MockAI (default `true`) |
| `GEMINI_API_KEY` | Live Gemini; unused in demo mode |
| `MONGODB_URI` | Optional; app falls back to memory |
| `JWT_SECRET` | Sign user/guest tokens |
| `ADMIN_TOKEN` | Protects `/api/v1/admin/*` and the admin socket |
| `CORS_ORIGINS` | Comma-separated frontend origins |
| `RISK_MODEL_PATH` | Optional override for `backend/ml/artifacts/risk_clf.joblib` |
| `WEAVIATE_URL` | Vector therapist search; local embeddings if unset |
| `SLACK_WEBHOOK_URL` / `TELEGRAM_*` / `RESEND_API_KEY` | Red-tier NGO channels |
| `YOUTUBE_API_KEY` | Optional live wellness video search |
| `FIRECRAWL_API_KEY` | Optional pharmacy crawl (static catalog is the default) |
| `CLOUDINARY_URL` | Optional image hosting |

Frontend: `VITE_API_URL` for the Render origin. Local Vite proxies `/api` and `/ws`.

## Tests

```bash
cd backend && pytest
```

## Deploy

- **API (Render):** Blueprint in `render.yaml`. Binds `0.0.0.0:$PORT`, health check `/health`.
- **Web (Vercel):** Root directory `frontend`. Set `VITE_API_URL` to the Render URL.

## Route map

`/`, `/consent`, `/login`, `/sign-in`, `/signup`, `/chat`, `/call`, `/therapists`, `/therapists/:id`, `/booking`, `/booking/confirmation`, `/resources`, `/help`, `/medicines`, `/pharmacy`, `/prescription-upload`, `/journey`, `/dashboard`, `/settings`, `/faq`, `/community`, `/admin`, `/admin/sessions/:id`, `/b2b-demo`, `/partner`, `/period`, `/wellness`.
