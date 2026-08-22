# Chat, therapist match, env files, Qwen, Swytchcode

Qwen is **not** the chatbot. Swytchcode is **not** the chatbot.

| What you see | What actually runs | Env file |
| --- | --- | --- |
| Chat replies (green / yellow) | **Gemini** whenever `GEMINI_API_KEY` is set (current flash models), else **MockAI** | `backend/.env` |
| Therapist cards after a message | Only when risk is **yellow**. Ranked via **Swytchcode Weaviate**, else local TF-IDF | `backend/.env` (`WEAVIATE_*` optional) |
| Crisis stop + 112 / 14416 | Keyword + sklearn (or Qwen LoRA if you trained it) | `RISK_MODEL_PATH` only if LoRA folder exists |
| Slack / pharmacy / YouTube / calendar | **Swytchcode CLI** (`swytchcode exec`) | `backend/.env` + `SWYTCHCODE_DEMO` |
| Website talking to API | Vite proxy, **or** `VITE_API_URL` | `frontend/.env` |

## 0. Chat / match still “not working” — checklist

1. Backend window must still show `Application startup complete` on port **8000**.
2. Frontend `npm run dev` on **5173** with a full `npm install` (framer-motion / gsap errors mean install is incomplete).
3. Open **`http://localhost:5173/login`** (not only the Network `10.x` URL if `VITE_API_URL` is `localhost`).
4. Click **Open User** — email `demo@soulcare.app` / `Demo@123`.  
   Therapist and B2B logins **do not** open Talk now.
5. Sidebar → **Talk now**.
6. Do **not** only type `hi`. That is **green** → reply only, **no** therapist cards.
7. Click the **Yellow · match** chip (or type `JEE exam stress is crushing me`) → cards on the right.
8. Confirm API: browser tab `http://localhost:8000/health` → `"ok": true`.

`frontend/.env` for local (restart `npm run dev` after editing):

```
VITE_API_URL=
```

Leave it **blank** so `/api` goes through the Vite proxy to `127.0.0.1:8000`.  
If you set `VITE_API_URL=http://localhost:8000`, it works **only on that PC**. Other laptops opening `http://10.x.x.x:5173` would call *their* localhost and chat would fail.

Three laptops, one host: keep `VITE_API_URL` blank, open `http://<host-lan-ip>:5173` on the other machines.

## 1. `backend/.env` — what to paste (API work happens HERE)

Path: `C:\Users\Lenovo\OneDrive\Desktop\soulcare\soulcare\backend\.env`

Copy from `.env.example` if the file is missing. Restart uvicorn after every change.

### Chatbot (Gemini vs MockAI)

There is **no markdown file of chatbot lines**. The repeating “breathe / drink water” reply was MockAI’s old single template in `backend/app/services/ai.py`, and was also triggered when `DEMO_MODE=true` forced MockAI even with a key, or when the model IDs were retired (1.5/2.0 flash → 404 → MockAI fallback).

Without a Gemini key, the companion still runs on MockAI:

```
GEMINI_API_KEY=
```

For a real open-ended LLM conversation:

```
DEMO_MODE=false
GEMINI_API_KEY=AIza...or AQ....your-google-ai-studio-key
GEMINI_MODELS=gemini-3.6-flash,gemini-3.5-flash,gemini-3.5-flash-lite,gemini-flash-latest
```

Get a key: [Google AI Studio](https://aistudio.google.com/apikey). Restart uvicorn. `GET /health` should show `"ai": "gemini"` and `"gemini_key_present": true`. This is **not** a Swytchcode key and **not** Qwen.

`DEMO_MODE` no longer disables Gemini — only a missing `GEMINI_API_KEY` does.

### Swytchcode (already in the code)

Keep this for the pitch if you have no Slack/Weaviate keys:

```
SWYTCHCODE_DEMO=true
```

The API still runs `swytchcode exec … --demo`. No extra Swytchcode API key. Login on the CLI was enough.

Live Slack NGO (optional):

```
SWYTCHCODE_DEMO=false
SLACK_BOT_TOKEN=xoxb-...
SLACK_CHANNEL_ID=C...
```

Live therapist vectors (optional — otherwise TF-IDF still recommends):

```
WEAVIATE_URL=https://YOUR-cluster.weaviate.cloud
WEAVIATE_API_KEY=...
```

Other optional Swytchcode keys: `FIRECRAWL_API_KEY`, `YOUTUBE_API_KEY`, `CLOUDINARY_URL`, `GOOGLE_CALENDAR_TOKEN`, `RESEND_API_KEY`, `NGO_ALERT_EMAIL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.

### Qwen (risk model only — not chat replies)

Do **not** put a Qwen API key. There isn’t one. Train on Colab, then:

```
RISK_MODEL_PATH=C:\Users\Lenovo\OneDrive\Desktop\soulcare\soulcare\backend\ml\artifacts\lora_adapter
```

Until that folder exists, the app uses sklearn `risk_clf.joblib`. Safety still works.

Optional only if Hugging Face blocks the download during Colab training:

```
HF_TOKEN=hf_...
```

That goes in Colab, not required in `backend/.env` for the running app.

## 2. Chat + therapist match — exact demo script

On the **user** laptop, Talk now:

| Type this | Risk | What you should see |
| --- | --- | --- |
| `I want to start meditating after work` | green | Companion reply. Right column empty. |
| `JEE exam stress is crushing me` | yellow | Reply + **Dr. Vikram** (or similar student/stress tags) on the right. |
| `I want to kill myself` | red | Fixed script, 112 / 14416, **no** Gemini, NGO via Swytchcode. |

If yellow has no cards, therapists did not seed — restart the API once (startup runs `seed_if_needed`).

## 3. Qwen LoRA — steps (classifier, not chatbot)

1. Colab → GPU T4.  
2. Open `backend/ml/colab_qwen_lora.ipynb` or `docs/qwen-lora.md`.  
3. `python ml/train_qwen_lora.py` (or DistilBERT script if GPU is weak).  
4. Download `backend/ml/artifacts/lora_adapter/`.  
5. Set `RISK_MODEL_PATH` to that folder. Restart uvicorn.  
6. Keyword red still wins over the model.

No OpenAI key. No Swytchcode key. Optional free `HF_TOKEN` only for the download.

## 4. Swytchcode — already integrated; keys optional

Code path: `backend/app/services/swytchcode_exec.py` → `swytchcode exec <canonical_id>`.

You already: logged in, checked out the branch, `bootstrap`, `list tooling`, API startup complete.

You do **not** paste a “Swytchcode API key” into `.env`. Provider keys (Slack bot, Weaviate, …) are optional. `SWYTCHCODE_DEMO=true` is the default.

`swytchcode doctor` Weaviate `{cluster_url}` error is expected without a cluster.

## 5. Restart order after env edits

1. Ctrl+C uvicorn → start again with `.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`  
2. Ctrl+C Vite → `npm run dev` again if you changed `frontend/.env`  
3. Hard-refresh the browser (Ctrl+Shift+R)  
4. Log in as **user** again
