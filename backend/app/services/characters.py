"""Companion personas — tone stays warm; name, accent, and TTS flavour differ."""

from __future__ import annotations

CHARACTERS = [
    {
        "id": "aisha",
        "name": "Aisha",
        "gender": "female",
        "nationality": "Indian",
        "avatarUrl": "https://api.dicebear.com/7.x/lorelei/svg?seed=Aisha&backgroundColor=dcebff",
        "voiceStyle": "warm, gentle Indian-English accent",
        "voiceLang": "en-IN",
        "voiceHint": "female",
        "rate": 0.92,
        "pitch": 1.05,
        "greeting": "Hey, I'm Aisha. What's on your mind today?",
    },
    {
        "id": "kabir",
        "name": "Kabir",
        "gender": "male",
        "nationality": "Indian",
        "avatarUrl": "https://api.dicebear.com/7.x/lorelei/svg?seed=Kabir&backgroundColor=eaf3ff",
        "voiceStyle": "calm, grounded Indian-English accent",
        "voiceLang": "en-IN",
        "voiceHint": "male",
        "rate": 0.94,
        "pitch": 0.85,
        "greeting": "Hi, I'm Kabir. We can take this one sentence at a time.",
    },
    {
        "id": "maya",
        "name": "Maya",
        "gender": "female",
        "nationality": "American",
        "avatarUrl": "https://api.dicebear.com/7.x/lorelei/svg?seed=Maya&backgroundColor=ffffff",
        "voiceStyle": "soft General American, unhurried",
        "voiceLang": "en-US",
        "voiceHint": "female",
        "rate": 0.96,
        "pitch": 1.08,
        "greeting": "Hey — Maya here. I'm listening. What feels present right now?",
    },
    {
        "id": "james",
        "name": "James",
        "gender": "male",
        "nationality": "British",
        "avatarUrl": "https://api.dicebear.com/7.x/lorelei/svg?seed=James&backgroundColor=dcebff",
        "voiceStyle": "quiet British English, never clipped",
        "voiceLang": "en-GB",
        "voiceHint": "male",
        "rate": 0.93,
        "pitch": 0.82,
        "greeting": "Hello, I'm James. No rush — what's sitting with you today?",
    },
    {
        "id": "yuki",
        "name": "Yuki",
        "gender": "female",
        "nationality": "Japanese",
        "avatarUrl": "https://api.dicebear.com/7.x/lorelei/svg?seed=Yuki&backgroundColor=eaf3ff",
        "voiceStyle": "soft Japanese-English, spacious pauses",
        "voiceLang": "en-GB",
        "voiceHint": "female",
        "rate": 0.88,
        "pitch": 1.12,
        "greeting": "Hi, I'm Yuki. We can go slowly. What would you like to share?",
    },
    {
        "id": "leo",
        "name": "Leo",
        "gender": "male",
        "nationality": "American",
        "avatarUrl": "https://api.dicebear.com/7.x/lorelei/svg?seed=Leo&backgroundColor=ffffff",
        "voiceStyle": "steady American, low and even",
        "voiceLang": "en-US",
        "voiceHint": "male",
        "rate": 0.95,
        "pitch": 0.8,
        "greeting": "Hey, Leo here. I'm with you. What's going on?",
    },
]

DEFAULT_CHARACTER_ID = "aisha"
BY_ID = {c["id"]: c for c in CHARACTERS}


def get_character(character_id: str | None) -> dict:
    return BY_ID.get((character_id or "").strip().lower()) or BY_ID[DEFAULT_CHARACTER_ID]


def list_characters() -> list[dict]:
    return list(CHARACTERS)
