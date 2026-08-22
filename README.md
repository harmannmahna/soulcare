# SoulCare

A safety-first holistic health platform: mental support, physical/lifestyle tracking, and crisis escalation in one app.

Every user message — text or transcribed voice — is **risk-classified on the server before any AI reply**. Red-tier (self-harm / crisis) language **never reaches an LLM**. Classification is a **hybrid**: a fine-tuned classifier plus a keyword/phrase rail. If **either** flags red, the turn is red. The user sees a fixed safety script, India’s emergency numbers (**112**, **Tele-MANAS 14416**), a partner NGO is notified **through Swytchcode**, and admins get a live WebSocket alert.

## Three demo desks (three laptops)

Same password: **`Demo@123`**. Open `/login` and click a card — or type the email.

| Role | Email | Home after login |
| --- | --- | --- |
| User / member | `demo@soulcare.app` | `/dashboard` |
| Therapist partner | `therapist@soulcare.app` | `/partner` (15% fee, slots, bookings) |
| B2B / college / NGO | `b2b@soulcare.app` | `/b2b-demo` (aggregates only, no names) |

`/signup` has the same three roles. Therapist and B2B skip the member details form.

Admin header: `X-Admin-Token: soulcare-admin-demo`

## What’s real vs demo

**Fully real**
- Green / yellow / red risk triage (English + Hinglish) — hybrid **sklearn TF-IDF + logistic regression** artifact with a keyword **OR-red** safety rail. Qwen2.5-0.5B LoRA (or DistilBERT LoRA) training path is documented for Colab.
- Guest + JWT auth, consent gate, **role-based dashboards**
- Therapist directory ranked through **Swytchcode Weaviate GraphQL** when live, else local TF-IDF cosine, else tags
- Booking IDs, partner notifications, **Google Calendar** via Swytchcode `calendar.event.create` plus a template URL
- Resources, daily check-ins, custom habits / streaks / habit score
- Admin session monitor + `/ws/admin` red alerts with model confidence and NGO-notified badges
- Red-tier **NGO notify through Swytchcode** (Slack `chat.postMessage`, Telegram, Resend; else `ngo_inbox`)
- Chat **session list + New chat** (summaries only — no long-term raw transcripts)
- Period tracker calendar, cycle prediction, optional symptom tags (female profiles)
- Recurring check-in popups (timer + inactivity + post-yellow)
- Pharmacy finder (static catalog + Swytchcode Firecrawl search when live)
- User / therapist / B2B dashboards as separate routes

**Demo / mocked**
- Prescription metadata (Swytchcode Cloudinary is invoked; not a medical record store)
- Counsellor takeover (UI + mocked queue)
- Community moderation (keyword-only)
- Calorie logging (lookup table, not photo vision)
- B2B `/b2b-demo` numbers (aggregate sample, not live campus data)

## Stack

| Layer | Tech |
| --- | --- |
| API | FastAPI, Motor/PyMongo, JWT, in-memory rate limit |
| Integrations | **Swytchcode kernel** (`swytchcode exec`) for Slack, Telegram, Resend, Weaviate, Firecrawl, YouTube, Google Calendar, Cloudinary |
| AI | Gemini with model failover, **MockAI** when `DEMO_MODE=true` or no key |
| Risk ML | sklearn TF-IDF + LogReg runtime; optional Qwen2.5-0.5B / DistilBERT LoRA adapter |
| Matching | Swytchcode Weaviate GraphQL, local TF-IDF fallback |
| Alerts | Swytchcode Slack / Telegram / Resend + `/ws/admin` |
| Web | React + Vite + Tailwind, Framer Motion, GSAP, React Three Fiber |
| Data | MongoDB, with an in-memory fallback if Mongo is down |
| Deploy | Render (`render.yaml`) + Vercel (`frontend/vercel.json`) |

## Quick start

```bash
# API (Python 3.9+; 3.10+ preferred. 3.9 needs eval_type_backport, already in requirements.txt)
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

Windows + Swytchcode: **`docs/swytchcode-setup.md`**. Login is not enough — you must `git checkout cursor/swytchcode-roles-qwen-d271` so `.swytchcode/tooling.json` exists, then run `bootstrap` **from that folder** (not `C:\WINDOWS\System32`, and not the placeholder `C:\path\to\soulcare`). On the Lenovo clone that is `C:\Users\Lenovo\OneDrive\Desktop\soulcare\soulcare`.

LoRA training: follow **`docs/qwen-lora.md`** (Colab T4, no paid API; optional free `HF_TOKEN`).

Optional local Mongo:

```bash
docker compose up mongo
```

## Safety pipeline

`backend/app/services/risk_triage.py` is isolated on purpose:

1. Classify the utterance with **keywords and the ML model**. Keyword red always wins; the model cannot downgrade a crisis phrase.
2. Persist **only** session + risk metadata (tier, rule, action, model confidence, NGO notify fields, timestamp). Raw chat is not stored long-term.
3. **Red:** return the fixed script (names the partner NGO), broadcast `/ws/admin`, notify via **Swytchcode**, **do not call Gemini**.
4. **Yellow:** companion reply + ranked therapists (Swytchcode Weaviate or local TF-IDF + match reason). A gentler check-in popup may follow.
5. **Green:** companion reply only.

Prompt injection cannot bypass the keyword rail: that matcher does not consult an LLM.

Metrics: `GET /api/v1/model_metrics` and `docs/model-metrics.md`.

NGO scope: `docs/ngo-integration.md`.

Swytchcode: `docs/swytchcode-setup.md`.

Qwen / DistilBERT LoRA: `docs/qwen-lora.md`.

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
| `RISK_MODEL_PATH` | sklearn `.joblib` **or** LoRA adapter **directory** |
| `SWYTCHCODE_DEMO` | `true` (default) adds `--demo` to every `swytchcode exec` |
| `SWYTCHCODE_BIN` | Override path to the CLI |
| `WEAVIATE_URL` | Live Weaviate; local embeddings if unset / demo |
| `SLACK_BOT_TOKEN` / `SLACK_CHANNEL_ID` | Red-tier NGO via Swytchcode Slack bot |
| `TELEGRAM_*` / `RESEND_API_KEY` | Other NGO channels via Swytchcode |
| `YOUTUBE_API_KEY` | Wellness video search via Swytchcode |
| `FIRECRAWL_API_KEY` | Pharmacy crawl via Swytchcode |
| `CLOUDINARY_URL` | Prescription upload via Swytchcode |
| `GOOGLE_CALENDAR_TOKEN` | Booking event insert via Swytchcode |

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
