# Swytchcode setup (SoulCare)

Every Slack / Telegram / Resend / Weaviate / Firecrawl / YouTube / Google Calendar / Cloudinary call in this repo goes:

```
FastAPI  →  swytchcode exec <canonical_id>  →  provider
```

Do **not** call those APIs with a raw SDK first. The kernel config is committed at `.swytchcode/tooling.json`.

`swytchcode get` and `swytchcode auth connect` need you to be logged in **on the machine that runs the API**.

---

## If you already logged in and `bootstrap` failed

Two separate mistakes showed up on the Lenovo laptop:

1. **`C:\path\to\soulcare` is not a real folder.** It was a placeholder. Your clone is:

   `C:\Users\Lenovo\OneDrive\Desktop\soulcare\soulcare`

2. **`.swytchcode/tooling.json` is on branch `cursor/swytchcode-roles-qwen-d271`, not on `main`.** Until you check that branch out (or merge PR #4), every `bootstrap` / `auth connect` command will say *no tooling.json*, even after a successful `swytchcode login`.

Never run `swytchcode init` from `C:\WINDOWS\System32`. That is not the repo.

Paste this block in PowerShell **as-is**:

```powershell
Set-Location C:\Users\Lenovo\OneDrive\Desktop\soulcare\soulcare

# You must see backend, frontend, and .git here
Get-ChildItem -Name backend, frontend, .git

git fetch origin
git checkout cursor/swytchcode-roles-qwen-d271
git pull origin cursor/swytchcode-roles-qwen-d271

# Dot-folders are hidden in Explorer — this must print tooling.json
Get-ChildItem -Force .swytchcode\tooling.json

swytchcode whoami
swytchcode bootstrap
swytchcode list tooling
swytchcode doctor
```

When `list tooling` prints Slack / Weaviate / Firecrawl / … the kernel is ready.

`swytchcode doctor` may show **one red check** and still be fine:

```
× [endpoint:Weaviate.weaviate:production_endpoint] invalid base URL: "https://{cluster_url}/v1"
```

That template is the Weaviate bundle default until you paste a real cluster URL. SoulCare then ranks therapists with local TF-IDF. Do not run `swytchcode init` to “fix” it.

Provider lines that say `not set` are also fine. Skip `auth connect` unless you have that key. The API still runs `swytchcode exec --demo`.

Start the app from **this same branch** (two PowerShell windows). Create `.venv` **before** activate — the folder does not exist on a fresh clone. Prefer calling the venv’s `python.exe` so Windows ExecutionPolicy cannot block `Activate.ps1`.

Wait until `pip` prints `Successfully installed …` before starting uvicorn.

```powershell
Set-Location C:\Users\Lenovo\OneDrive\Desktop\soulcare\soulcare\backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
if (-not (Test-Path .env)) { copy .env.example .env }
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

```powershell
Set-Location C:\Users\Lenovo\OneDrive\Desktop\soulcare\soulcare\frontend
npm install
npm run dev
```

Open `http://localhost:5173/login`. Password `Demo@123`:

- User laptop → `demo@soulcare.app` → `/dashboard`
- Therapist laptop → `therapist@soulcare.app` → `/partner`
- B2B laptop → `b2b@soulcare.app` → `/b2b-demo`

Optional live providers (only if you have keys), still inside the repo folder:

```powershell
Set-Location C:\Users\Lenovo\OneDrive\Desktop\soulcare\soulcare
swytchcode auth connect slack
swytchcode auth status
```

Login is already done (`harmann3883@gmail.com`); do **not** log in again unless the session expired.

If `git checkout` complains about local changes:

```powershell
git status
git stash -u
git checkout cursor/swytchcode-roles-qwen-d271
git pull origin cursor/swytchcode-roles-qwen-d271
```

---

## 1. Install CLI (Windows PowerShell)

Open a **new** PowerShell after install so `PATH` picks up the binary.

```powershell
swytchcode --version
# expect 2.x  (you already have 2.20.15)

$repo = "C:\Users\Lenovo\OneDrive\Desktop\soulcare\soulcare"
Set-Location $repo
```

If `swytchcode` is not found, close the terminal and open a fresh one.

## 2. Log in (required — already done on this laptop)

```powershell
Set-Location C:\Users\Lenovo\OneDrive\Desktop\soulcare\soulcare
swytchcode login
swytchcode whoami
```

`login` prints a device-flow URL. Open it in the browser, approve, then come back to the terminal.

You already logged in as `harmann3883@gmail.com`. Skip this until `whoami` says the session expired.

## 3. Project is already initialised — on the Swytchcode branch

You should **not** need `swytchcode init` if `.swytchcode/tooling.json` exists after the checkout above.

- `.swytchcode/tooling.json` (mode: `sandbox`)
- wrekenfiles under `.swytchcode/integrations/`

```powershell
Set-Location C:\Users\Lenovo\OneDrive\Desktop\soulcare\soulcare
swytchcode bootstrap
swytchcode list tooling
swytchcode doctor
```

Enabled methods (canonical IDs):

| Alias in code | Canonical ID | Used for |
| --- | --- | --- |
| `slack` | `slack.chat.postmessage.create` | Red-tier NGO Slack |
| `telegram` | `telegram_v5_0.sendmessage.create` | Red-tier NGO Telegram |
| `resend` | `resend.email.create` | Red-tier NGO email |
| `weaviate_graphql` | `weaviate.graphql.create` | Therapist vector match |
| `firecrawl_search` | `firecrawl.search.create` | Pharmacy listings |
| `youtube_search` | `youtube.search.list` | Wellness videos |
| `gcal_event` | `calendar.event.create` | Booking calendar event |
| `cloudinary_upload` | `cloudinary.upload.create` | Prescription filename upload |

## 4. Connect providers

Run these **only after** `list tooling` works. Stay inside the repo folder.

```powershell
Set-Location C:\Users\Lenovo\OneDrive\Desktop\soulcare\soulcare
swytchcode auth connect slack
swytchcode auth connect telegram_v5_0
swytchcode auth connect resend
swytchcode auth connect weaviate
swytchcode auth connect firecrawl
swytchcode auth connect youtube
swytchcode auth connect "Google Calendar"
swytchcode auth connect cloudinary
swytchcode auth status
```

If a provider name is rejected, run `swytchcode auth connect` with no argument — it lists what this project requires.

Skip any provider you do not have a key for. The API still calls `swytchcode exec --demo`.

Slack incoming **webhooks are not** the Swytchcode method. Swytchcode posts with a **bot token + channel id** (`chat.postMessage`). Create a Slack app → Bot Token (`xoxb-…`) → invite the bot to `#ngo-alerts` → copy the channel ID.

## 5. Map keys into `backend/.env`

Copy `backend/.env.example` → `backend/.env` (never commit `.env`).

Minimum for a **live** Slack NGO ping during the pitch:

```
SWYTCHCODE_DEMO=false
SLACK_BOT_TOKEN=xoxb-...
SLACK_CHANNEL_ID=C0123456789
```

Then restart uvicorn.

| Env var | Needed when | Where to get it |
| --- | --- | --- |
| `SWYTCHCODE_DEMO` | `false` for live calls; `true` (default) always adds `--demo` | local |
| `SWYTCHCODE_BIN` | only if `swytchcode` is not on PATH | full path to `swytchcode.exe` |
| `SLACK_BOT_TOKEN` + `SLACK_CHANNEL_ID` | live Slack NGO | Slack app + channel |
| `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` | live Telegram NGO | BotFather |
| `RESEND_API_KEY` + `NGO_ALERT_EMAIL` | live email NGO | resend.com |
| `WEAVIATE_URL` + `WEAVIATE_API_KEY` | live therapist vectors | weaviate Cloud |
| `FIRECRAWL_API_KEY` | live pharmacy crawl | firecrawl.dev |
| `YOUTUBE_API_KEY` | live wellness search | Google Cloud YouTube Data API |
| `GOOGLE_CALENDAR_TOKEN` | live calendar insert | Google OAuth access token |
| `CLOUDINARY_URL` | live Rx upload | cloudinary://key:secret@cloud |

**No key = still Swytchcode.** The API runs `swytchcode exec … --demo`. Slack’s kernel currently has no hosted demo fixture (`demo unavailable … supported: stripe.create_payment`), but the call still went through the CLI. Admin `notifiedChannel` will look like `swytchcode:slack.chat.postmessage.create:demo`. The alert is also written to `ngo_inbox`.

## 6. Run the API

```powershell
Set-Location C:\Users\Lenovo\OneDrive\Desktop\soulcare\soulcare\backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
if (-not (Test-Path .env)) { copy .env.example .env }
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Frontend (second terminal):

```powershell
Set-Location C:\Users\Lenovo\OneDrive\Desktop\soulcare\soulcare\frontend
npm install
npm run dev
```

Open `http://localhost:5173/login`.

## 7. Three laptops (hackathon desks)

Same password: **`Demo@123`**

| Laptop | Click on `/login` | Email | Lands on |
| --- | --- | --- | --- |
| 1 · member | **Open User** | `demo@soulcare.app` | `/dashboard` |
| 2 · therapist | **Open Therapist** | `therapist@soulcare.app` | `/partner` (15% fee, slots) |
| 3 · college / NGO | **Open B2B / college** | `b2b@soulcare.app` | `/b2b-demo` (aggregates only) |

Or type the email on `/login`, or pick the matching role on `/signup` and create a fresh account.

Pitch check on laptop 1: send a red chat (`I want to kill myself`). You should see 112 + 14416, **no** Gemini reply, and admin `notifiedChannel` starting with `swytchcode:`.

## 8. Optional live smoke from PowerShell

From the **repo root**:

```powershell
Set-Location C:\Users\Lenovo\OneDrive\Desktop\soulcare\soulcare
swytchcode exec slack.chat.postmessage.create --json --demo --body "{\"channel\":\"#ngo-alerts\",\"text\":\"SoulCare ping\"}" --header token=xoxb-demo
```

With `SWYTCHCODE_DEMO=false` and a real bot token, drop `--demo` and use the live token/channel.
