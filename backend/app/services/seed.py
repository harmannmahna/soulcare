"""Rich demo catalogs so the app looks alive for judges without a live DB."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.security import hash_password
from app.store import store

NOW = datetime(2026, 8, 22, 8, 0, tzinfo=timezone.utc)


def _dt(days: int = 0, hours: int = 0) -> datetime:
    return NOW + timedelta(days=days, hours=hours)


THERAPISTS = [
    {
        "id": "th_ananya",
        "name": "Dr. Ananya Mehta",
        "title": "Clinical Psychologist",
        "city": "Mumbai",
        "languages": ["English", "Hindi", "Hinglish"],
        "tags": ["anxiety", "cbt", "mindfulness", "sleep"],
        "rating": 4.9,
        "reviews": 214,
        "price_inr": 1800,
        "years": 11,
        "bio": "Ananya helps people slow racing thoughts with CBT and breath-led mindfulness. Sessions feel like a quiet room, not a lecture.",
        "approach": "CBT + mindfulness, paced homework, culturally fluent Hinglish when it helps.",
        "photo_hue": 152,
    },
    {
        "id": "th_rohan",
        "name": "Dr. Rohan Iyer",
        "title": "Counselling Psychologist",
        "city": "Bengaluru",
        "languages": ["English", "Tamil", "Hindi"],
        "tags": ["depression", "mood", "cbt", "loneliness"],
        "rating": 4.8,
        "reviews": 167,
        "price_inr": 1600,
        "years": 9,
        "bio": "Rohan works with low mood and the quiet kind of loneliness that shows up after work. He is direct, kind, and never rushed.",
        "approach": "Behavioural activation, values work, and small weekly experiments.",
        "photo_hue": 210,
    },
    {
        "id": "th_fatima",
        "name": "Dr. Fatima Khan",
        "title": "Relationship Therapist",
        "city": "Hyderabad",
        "languages": ["English", "Hindi", "Urdu"],
        "tags": ["relationship", "couples", "family"],
        "rating": 4.9,
        "reviews": 198,
        "price_inr": 2200,
        "years": 13,
        "bio": "Fatima sits with couples and families through rupture — breakups, in-laws, and the fights that keep repeating.",
        "approach": "Emotion-focused and systemic; one partner can still start alone.",
        "photo_hue": 330,
    },
    {
        "id": "th_vikram",
        "name": "Dr. Vikram Singh",
        "title": "Student Wellness Counsellor",
        "city": "Delhi",
        "languages": ["English", "Hindi", "Punjabi"],
        "tags": ["student", "academic", "stress", "anxiety"],
        "rating": 4.7,
        "reviews": 142,
        "price_inr": 1200,
        "years": 7,
        "bio": "Vikram knows JEE/NEET/boards pressure from the inside. He helps students unhook self-worth from a rank.",
        "approach": "Stress inoculation, study-rhythm design, family-boundary scripts.",
        "photo_hue": 25,
    },
    {
        "id": "th_priya",
        "name": "Dr. Priya Nair",
        "title": "Trauma-informed Therapist",
        "city": "Kochi",
        "languages": ["English", "Malayalam", "Hindi"],
        "tags": ["trauma", "ptsd", "grief", "loss", "bereavement"],
        "rating": 5.0,
        "reviews": 88,
        "price_inr": 2400,
        "years": 15,
        "bio": "Priya specialises in grief and trauma that the body still remembers. Safety and pacing come first.",
        "approach": "Trauma-informed, somatic grounding, narrative reconstruction.",
        "photo_hue": 280,
    },
    {
        "id": "th_arjun",
        "name": "Dr. Arjun Desai",
        "title": "Occupational Health Psychologist",
        "city": "Pune",
        "languages": ["English", "Hindi", "Marathi"],
        "tags": ["burnout", "work", "stress", "sleep"],
        "rating": 4.6,
        "reviews": 121,
        "price_inr": 2000,
        "years": 10,
        "bio": "Arjun works with burnout, toxic workplaces, and the Sunday-night dread that will not leave.",
        "approach": "Recovery scheduling, boundary rehearsal, sleep-first protocols.",
        "photo_hue": 190,
    },
    {
        "id": "th_meera",
        "name": "Dr. Meera Joshi",
        "title": "Identity & Affirmative Therapist",
        "city": "Pune",
        "languages": ["English", "Hindi", "Marathi"],
        "tags": ["lgbtq", "identity", "anxiety", "family"],
        "rating": 4.9,
        "reviews": 96,
        "price_inr": 1900,
        "years": 8,
        "bio": "Meera offers affirmative care for queer and questioning adults navigating family, coming out, and belonging.",
        "approach": "Affirmative, intersectional, family-systems when invited.",
        "photo_hue": 300,
    },
    {
        "id": "th_kabir",
        "name": "Dr. Kabir Sharma",
        "title": "Addiction & Habit Specialist",
        "city": "Jaipur",
        "languages": ["English", "Hindi"],
        "tags": ["addiction", "habits", "cbt", "depression"],
        "rating": 4.7,
        "reviews": 110,
        "price_inr": 1700,
        "years": 12,
        "bio": "Kabir helps people change patterns — smoking, drinking, doomscrolling — without shame as the engine.",
        "approach": "Motivational interviewing + CBT habit loops.",
        "photo_hue": 40,
    },
]


def _slots_for(therapist_id: str) -> list[dict]:
    slots = []
    idx = 0
    for day in range(1, 10):
        for hour in (9, 11, 15, 18):
            if (hash(therapist_id) + day + hour) % 3 == 0:
                continue
            idx += 1
            slots.append(
                {
                    "id": f"{therapist_id}_slot_{idx}",
                    "therapist_id": therapist_id,
                    "starts_at": _dt(days=day, hours=hour - 8).isoformat(),
                    "label": f"{(_dt(days=day)).strftime('%a %d %b')} · {hour:02d}:00 IST",
                    "taken": idx in {2, 7},
                }
            )
    return slots


RESOURCES = [
    {
        "id": "res_box_breath",
        "title": "Box breathing (4-4-4-4)",
        "kind": "breathing",
        "minutes": 4,
        "tags": ["anxiety", "sleep"],
        "summary": "A square breath used by first responders to settle the nervous system.",
        "body": "Inhale 4 · hold 4 · exhale 4 · hold 4. Repeat eight times. Keep the jaw loose.",
    },
    {
        "id": "res_54321",
        "title": "5-4-3-2-1 grounding",
        "kind": "grounding",
        "minutes": 5,
        "tags": ["anxiety", "trauma", "panic"],
        "summary": "Name the room back into the present when thoughts spiral.",
        "body": "5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.",
    },
    {
        "id": "res_journal_weather",
        "title": "Inner weather journal",
        "kind": "journaling",
        "minutes": 8,
        "tags": ["depression", "mood"],
        "summary": "Describe today's mood as weather — no fixing required.",
        "body": "If your mind were a sky, what is the weather? What would a kind forecast say for tonight?",
    },
    {
        "id": "res_walk",
        "title": "Ten-minute outside walk",
        "kind": "movement",
        "minutes": 10,
        "tags": ["depression", "habits", "work"],
        "summary": "Low-bar movement that still counts as care.",
        "body": "Step outside. Notice 3 colours. Keep your phone in a pocket. That is the whole practice.",
    },
    {
        "id": "res_body_scan",
        "title": "Short body scan",
        "kind": "grounding",
        "minutes": 6,
        "tags": ["sleep", "trauma", "anxiety"],
        "summary": "Move attention from toes to brow without changing anything.",
        "body": "Lie down. Visit each region for one breath. If you drift, return kindly.",
    },
    {
        "id": "res_hinglish_saans",
        "title": "4-7-8 saans",
        "kind": "breathing",
        "minutes": 3,
        "tags": ["sleep", "anxiety"],
        "summary": "A night-time breath in simple Hinglish cues.",
        "body": "4 gin ke saans andar · 7 hold · 8 lambi saans bahar. Chaar tur. Pillow cool rakhna.",
    },
]

HELP_ITEMS = [
    {"id": "help_112", "name": "National Emergency", "phone": "112", "region": "India", "kind": "crisis"},
    {"id": "help_14416", "name": "Tele-MANAS", "phone": "14416", "region": "India", "kind": "mental_health"},
    {"id": "help_aasra", "name": "AASRA", "phone": "9820466726", "region": "Mumbai / national", "kind": "suicide_prevention"},
    {"id": "help_vandrevala", "name": "Vandrevala Foundation", "phone": "9999666555", "region": "India", "kind": "mental_health"},
    {"id": "help_icall", "name": "iCALL (TISS)", "phone": "9152987821", "region": "India", "kind": "counselling"},
]

MEDICINES = [
    {"id": "med_dolo", "name": "Dolo 650", "use": "Fever / pain (OTC demo)", "form": "tablet", "price_inr": 32},
    {"id": "med_crocin", "name": "Crocin Advance", "use": "Headache / fever (OTC demo)", "form": "tablet", "price_inr": 38},
    {"id": "med_ors", "name": "Electral ORS", "use": "Dehydration", "form": "sachet", "price_inr": 24},
    {"id": "med_vitd", "name": "Vitamin D3 60K", "use": "Supplement (demo)", "form": "capsule", "price_inr": 90},
    {"id": "med_melatonin", "name": "Melatonin 3mg", "use": "Sleep support (demo — not medical advice)", "form": "tablet", "price_inr": 145},
]

PHARMACIES = [
    {
        "id": "ph_apollo_kp",
        "name": "Apollo Pharmacy — Koramangala",
        "city": "Bengaluru",
        "area": "5th Block",
        "open": "8:00 – 23:00",
        "phone": "080-4000-1111",
        "lat": 12.9352,
        "lng": 77.6245,
        "products": ["med_dolo", "med_ors", "med_crocin"],
    },
    {
        "id": "ph_medplus_andheri",
        "name": "MedPlus — Andheri West",
        "city": "Mumbai",
        "area": "Lokhandwala",
        "open": "8:00 – 22:30",
        "phone": "022-6700-2211",
        "lat": 19.1360,
        "lng": 72.8296,
        "products": ["med_crocin", "med_vitd"],
    },
    {
        "id": "ph_wellness_cp",
        "name": "Wellness Forever — Connaught Place",
        "city": "Delhi",
        "area": "Inner Circle",
        "open": "24 hours",
        "phone": "011-4300-9090",
        "lat": 28.6315,
        "lng": 77.2167,
        "products": ["med_dolo", "med_melatonin", "med_ors"],
    },
]

FOODS = [
    {"id": "food_idli", "name": "Idli (2 pcs)", "kcal": 140, "tags": ["breakfast", "south"]},
    {"id": "food_dosa", "name": "Masala dosa", "kcal": 350, "tags": ["breakfast"]},
    {"id": "food_poha", "name": "Poha bowl", "kcal": 270, "tags": ["breakfast"]},
    {"id": "food_dal_rice", "name": "Dal + rice", "kcal": 420, "tags": ["lunch"]},
    {"id": "food_roti_sabzi", "name": "2 roti + sabzi", "kcal": 380, "tags": ["dinner"]},
    {"id": "food_curd_rice", "name": "Curd rice", "kcal": 310, "tags": ["lunch"]},
    {"id": "food_chai", "name": "Chai with milk + sugar", "kcal": 90, "tags": ["drink"]},
    {"id": "food_banana", "name": "Banana", "kcal": 105, "tags": ["snack"]},
    {"id": "food_samosa", "name": "Samosa", "kcal": 260, "tags": ["snack"]},
    {"id": "food_biryani", "name": "Chicken biryani bowl", "kcal": 580, "tags": ["lunch"]},
]

PAGES = [
    {"path": "/", "name": "Home", "auth": False},
    {"path": "/consent", "name": "Consent", "auth": False},
    {"path": "/login", "name": "Login", "auth": False},
    {"path": "/sign-in", "name": "Sign in", "auth": False},
    {"path": "/signup", "name": "Sign up", "auth": False},
    {"path": "/chat", "name": "Chat", "auth": False},
    {"path": "/call", "name": "Voice call", "auth": False},
    {"path": "/therapists", "name": "Therapists", "auth": False},
    {"path": "/therapists/:id", "name": "Therapist detail", "auth": False},
    {"path": "/booking", "name": "Booking", "auth": True},
    {"path": "/booking/confirmation", "name": "Booking confirmation", "auth": True},
    {"path": "/resources", "name": "Resources", "auth": False},
    {"path": "/resources/:id", "name": "Resource detail", "auth": False},
    {"path": "/help", "name": "Help directory", "auth": False},
    {"path": "/medicines", "name": "Medicines", "auth": False},
    {"path": "/medicines/:id", "name": "Medicine detail", "auth": False},
    {"path": "/pharmacy", "name": "Pharmacy", "auth": False},
    {"path": "/pharmacy/:id", "name": "Pharmacy detail", "auth": False},
    {"path": "/prescription-upload", "name": "Prescription upload", "auth": True},
    {"path": "/journey", "name": "Journey", "auth": True},
    {"path": "/dashboard", "name": "Dashboard", "auth": True},
    {"path": "/settings", "name": "Settings", "auth": True},
    {"path": "/faq", "name": "FAQ", "auth": False},
    {"path": "/community", "name": "Community", "auth": False},
    {"path": "/admin", "name": "Admin", "auth": "admin"},
    {"path": "/admin/sessions/:id", "name": "Admin session", "auth": "admin"},
]


def _demo_user() -> dict:
    return {
        "id": "usr_demo",
        "email": "demo@soulcare.app",
        "name": "Aanya Rao",
        "password_hash": hash_password("Demo@123"),
        "guest": False,
        "language": "hinglish",
        "bedtime": "23:00",
        "focus_hours": "10:00-13:00",
        "consent": True,
        "consent_at": _dt(days=-12).isoformat(),
        "created_at": _dt(days=-40).isoformat(),
        "saved_resources": ["res_box_breath", "res_54321"],
    }


def _checkins(user_id: str) -> list[dict]:
    moods = [3, 4, 2, 3, 4, 5, 3, 4, 4, 2, 3, 5, 4, 3]
    rows = []
    for i, mood in enumerate(moods):
        rows.append(
            {
                "id": f"chk_{user_id}_{i}",
                "user_id": user_id,
                "mood": mood,
                "sleep_hours": [6.5, 7, 5.5, 7.5, 8, 6, 7, 7.2, 6.8, 5, 7.5, 8, 7, 6.5][i],
                "hydration": [4, 6, 3, 5, 7, 6, 5, 8, 6, 4, 5, 7, 6, 5][i],
                "note": [
                    "Heavy Monday, but the walk helped.",
                    "Slept better after 4-7-8.",
                    "Exam dream, woke tired.",
                    "Good chai with a friend.",
                    "Focus block actually worked.",
                    "Light day. Grateful.",
                    "Family call was tense.",
                    "Badminton after work.",
                    "Okay-ish. Brain fog.",
                    "Low energy, stayed kind anyway.",
                    "Journaled for 8 minutes.",
                    "Best sleep this month.",
                    "Steady.",
                    "A bit restless at night.",
                ][i],
                "created_at": _dt(days=-(len(moods) - 1 - i), hours=20).isoformat(),
            }
        )
    return rows


def _habits(user_id: str) -> list[dict]:
    def grid(pattern: list[int]) -> list[dict]:
        days = []
        for i, done in enumerate(pattern):
            day = (NOW - timedelta(days=len(pattern) - 1 - i)).date().isoformat()
            days.append({"date": day, "done": bool(done)})
        return days

    return [
        {
            "id": "hab_meditate",
            "user_id": user_id,
            "name": "10-min meditation",
            "kind": "start",
            "color": "#4A7C6A",
            "created_at": _dt(days=-28).isoformat(),
            "active": True,
            "log": grid([1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1]),
        },
        {
            "id": "hab_badminton",
            "user_id": user_id,
            "name": "Badminton / exercise",
            "kind": "start",
            "color": "#C45C5C",
            "created_at": _dt(days=-21).isoformat(),
            "active": True,
            "log": grid([0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1]),
        },
        {
            "id": "hab_java",
            "user_id": user_id,
            "name": "Java Full Stack study",
            "kind": "start",
            "color": "#3D6B8C",
            "created_at": _dt(days=-18).isoformat(),
            "active": True,
            "log": grid([1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1]),
        },
        {
            "id": "hab_smoke",
            "user_id": user_id,
            "name": "No smoking",
            "kind": "quit",
            "color": "#D4A017",
            "created_at": _dt(days=-14).isoformat(),
            "active": True,
            "log": grid([1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1]),
        },
    ]


async def seed_if_needed() -> None:
    users = store.collection("users")
    if await users.find_one({"id": "usr_demo"}):
        return

    await users.insert_one(_demo_user())
    await store.collection("therapists").insert_many(THERAPISTS)
    slots = []
    for t in THERAPISTS:
        slots.extend(_slots_for(t["id"]))
    await store.collection("slots").insert_many(slots)
    await store.collection("resources").insert_many(RESOURCES)
    await store.collection("help").insert_many(HELP_ITEMS)
    await store.collection("medicines").insert_many(MEDICINES)
    await store.collection("pharmacies").insert_many(PHARMACIES)
    await store.collection("foods").insert_many(FOODS)
    await store.collection("pages").insert_many(PAGES)
    await store.collection("checkins").insert_many(_checkins("usr_demo"))
    await store.collection("habits").insert_many(_habits("usr_demo"))
    await store.collection("bookings").insert_one(
        {
            "id": "bk_demo_1",
            "user_id": "usr_demo",
            "therapist_id": "th_ananya",
            "slot_id": "th_ananya_slot_1",
            "starts_at": _dt(days=2, hours=1).isoformat(),
            "status": "confirmed",
            "created_at": _dt(days=-1).isoformat(),
        }
    )
    await store.collection("sessions").insert_one(
        {
            "id": "ses_demo_live",
            "user_id": "usr_demo",
            "guest": False,
            "channel": "chat",
            "started_at": _dt(hours=-2).isoformat(),
            "last_tier": "green",
            "last_action": "companion_reply",
            "turn_count": 4,
            "active": True,
            "taken_over": False,
            "consent": True,
        }
    )
    await store.collection("risk_events").insert_many(
        [
            {
                "id": "ev_demo_1",
                "session_id": "ses_demo_live",
                "user_id": "usr_demo",
                "tier": "green",
                "triggered_rule": None,
                "action": "companion_reply",
                "problem_type": "general",
                "created_at": _dt(hours=-2).isoformat(),
            },
            {
                "id": "ev_demo_2",
                "session_id": "ses_demo_hist",
                "user_id": "usr_demo",
                "tier": "yellow",
                "triggered_rule": "academic_pressure",
                "action": "companion_plus_therapist_match",
                "problem_type": "academic",
                "created_at": _dt(days=-3).isoformat(),
            },
        ]
    )
    await store.collection("community").insert_many(
        [
            {
                "id": "com_1",
                "alias": "quiet-mango",
                "body": "Finished a 7-day no-smoke streak. The evening chai craving is real, but the walk after dinner helps.",
                "created_at": _dt(hours=-5).isoformat(),
            },
            {
                "id": "com_2",
                "alias": "soft-neem",
                "body": "Exam week. Sharing in case someone else needs the reminder: one chapter is still a win.",
                "created_at": _dt(hours=-12).isoformat(),
            },
        ]
    )
    await store.collection("cycles").insert_one(
        {
            "user_id": "usr_demo",
            "cycle_length": 28,
            "period_length": 5,
            "last_start": (NOW.date() - timedelta(days=12)).isoformat(),
            "last_end": (NOW.date() - timedelta(days=8)).isoformat(),
        }
    )
