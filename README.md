# SoulCare

A safety-first holistic health platform: mental support, physical/lifestyle tracking, and crisis escalation in one app.

Every user message — text or transcribed voice — is **risk-classified on the server before any AI reply**. Red-tier (self-harm / crisis) language **never reaches an LLM**. The user sees a fixed safety script and India’s emergency numbers (**112**, **Tele-MANAS 14416**), and admins get a live WebSocket alert.

## What’s real vs demo

**Fully real**
- Green / yellow / red risk triage (English + Hinglish)
- Guest + JWT auth, consent gate
- Therapist directory, specialty matching, booking IDs
- Resources, daily check-ins, custom habits / streaks / habit score
- Admin session monitor + `/ws/admin` red alerts
- Emergency escalation UX

**Demo / mocked**
- Pharmacy & medicines catalogs
- Prescription metadata (not a medical record store)
- Counsellor takeover (UI + mocked queue)
- Community moderation (keyword-only)
- Calorie logging (lookup table, not photo vision)
- Live geolocation for pharmacies

## Stack

| Layer | Tech |
| --- | --- |
| API | FastAPI, Motor/PyMongo, JWT, in-memory rate limit |
| AI | Gemini with model failover, **MockAI** when `DEMO_MODE=true` or no key |
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

1. Classify the utterance (keyword / phrase, including Hinglish).
2. Persist **only** session + risk metadata (tier, rule, action, timestamp). Raw chat is not stored long-term.
3. **Red:** return the fixed script, broadcast `/ws/admin`, **do not call Gemini**.
4. **Yellow:** companion reply + ranked therapists from the same directory (tags match the problem type).
5. **Green:** companion reply only.

Prompt injection cannot bypass this: classification does not consult the model.

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

Frontend: `VITE_API_URL` for the Render origin. Local Vite proxies `/api` and `/ws`.

## Tests

```bash
cd backend && pytest
```

## Deploy

- **API (Render):** Blueprint in `render.yaml`. Binds `0.0.0.0:$PORT`, health check `/health`.
- **Web (Vercel):** Root directory `frontend`. Set `VITE_API_URL` to the Render URL.

## Route map

`/`, `/consent`, `/login`, `/sign-in`, `/signup`, `/chat`, `/call`, `/therapists`, `/therapists/:id`, `/booking`, `/booking/confirmation`, `/resources`, `/help`, `/medicines`, `/pharmacy`, `/prescription-upload`, `/journey`, `/dashboard`, `/settings`, `/faq`, `/community`, `/admin`, `/admin/sessions/:id`.
