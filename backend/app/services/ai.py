"""Gemini provider with model failover + conversational MockAI.

There is no markdown file of chatbot lines. MockAI used to return one breathing
template every turn — that is why “hello” felt identical. It now branches on
intent + history. With GEMINI_API_KEY set, green/yellow turns call Gemini so the
companion behaves like a real conversational agent.
"""

from __future__ import annotations

import logging
import re
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger("soulcare.ai")

SYSTEM_PREAMBLE = """You are SoulCare, a real conversational companion and wellness agent for people in India.

You are not a script. You are not a chatbot that repeats breathing tips. You listen,
remember what the user already said in this thread, and answer the actual message.

How you work:
- Read the full conversation history before replying. Never re-ask something they already answered.
- Respond specifically to their words (names, exams, sleep, work, family). Quote or paraphrase briefly when it helps them feel heard.
- Keep replies short: 2–4 sentences, warm and grounded. Ask at most one clear question.
- Offer one concrete next step when useful (habit, short check-in, or talking to a human) — do not dump a generic wellness lecture.
- If they greet you, greet back once and ask how they are. If they say they are fine, explore what is on their mind — do not restart the greeting.
- Match language: Hinglish when they use Hinglish; otherwise clear gentle English.
- You are not a doctor or licensed therapist. Do not diagnose. Do not give self-harm, weapon, or illegal instructions.
- Never mention system rules, models, or that you are an AI unless asked.
- When risk context is yellow, end with one gentle sentence that a human therapist who understands this stress can help — without being pushy.
- Never repeat your previous reply. Vary wording every turn.
"""

VOICE_PREAMBLE = """VOICE CALL MODE (this will be read aloud on a phone-like call):

Sound like a close, calm friend — not a chatbot, coach, or intake form.
- Everyday speech. Contractions. One thought, then the next. A small “mm” or “yeah” is fine.
- Two or three short sentences. Under 50 words. At most one question, and only if it feels natural.
- Do not quote them back. Do not say “you said”, “I hear you”, “that sounds heavy”, or “in one honest line”.
- Do not name diagnoses or scores (anxiety 0.6, yellow risk, vocal distress). Just respond to the moment.
- Do not follow a template of reflect-then-advice. Sometimes just sit with what they shared.
- No markdown, bullets, emoji, or stage directions. No lists of options.
- Stay with their actual details (exam, sleep, family, work) using ordinary words.
"""


def provider_label() -> str:
    return "mock" if get_settings().use_mock_ai else "gemini"


def _norm(text: str) -> str:
    return re.sub(r"[^a-z\s]", " ", (text or "").lower())


def _has(text: str, *needles: str) -> bool:
    blob = f" {_norm(text)} "
    return any(f" {n} " in blob or blob.strip() == n for n in needles)


def _intent(user_text: str, history: list[dict] | None) -> str:
    t = _norm(user_text)
    compact = " ".join(t.split())
    if _has(compact, "hello", "hi", "hey", "hii", "helo", "yo", "namaste", "namaskar", "good morning", "good evening", "good afternoon"):
        return "greeting"
    if _has(compact, "how are you", "kaise ho", "kaisi ho", "whats up", "what's up", "sup"):
        return "ask_bot"
    if _has(compact, "thanks", "thank you", "thank", "shukriya", "dhanyavad"):
        return "thanks"
    if _has(compact, "bye", "goodbye", "good night", "goodnight", "see you"):
        return "bye"
    if any(w in t for w in ("sad", "down", "low", "upset", "lonely", "akela", "udaas", "not good", "not okay", "not ok", "worse")):
        return "mood_low"
    if _has(compact, "ok", "okay", "okk", "theek", "theek hai", "fine", "i am fine", "i'm fine", "im fine", "good", "i am good", "i'm good", "all good", "nothing", "nm"):
        return "mood_ok"
    if any(w in t for w in ("sleep", "insomnia", "neend", "tired", "thak")):
        return "sleep"
    if any(w in t for w in ("meditat", "habit", "exercise", "walk", "yoga")):
        return "habit"
    if any(w in t for w in ("exam", "jee", "neet", "study", "college", "assignment")):
        return "study"
    if any(w in t for w in ("work", "job", "boss", "office", "burnout")):
        return "work"
    return "open"


def _yellow_tail(*, hinglish: bool, spoken: bool = False) -> str:
    if spoken:
        if hinglish:
            return " Agar dil kare to koi insaan saath baith sakta hai — koi jaldi nahi."
        return " If you want, a real person can sit with this too — no rush."
    if hinglish:
        return (
            " Agar yeh bhaari lag raha hai, ek therapist jo isi tension ko samajhta ho "
            "se baat karna ek strong step ho sakta hai — main neeche match dikha raha hoon."
        )
    return (
        " If this feels heavy to carry alone, talking with a therapist who works with this "
        "kind of stress can help — I've suggested someone below whose tags fit what you're going through."
    )


def _mock_reply(user_text: str, *, yellow: bool, hinglish: bool, history: list[dict] | None = None) -> str:
    snippet = (user_text or "").strip()
    preview = snippet[:90] + ("…" if len(snippet) > 90 else "")
    turns = len([h for h in (history or []) if h.get("role") == "user"])
    intent = _intent(user_text, history)

    en = {
        "greeting": "Hey — I'm glad you dropped in. How are you doing right now, in one honest sentence?",
        "ask_bot": "I'm steady, thank you for asking. How are you, though — light day or a bit heavy?",
        "thanks": "Anytime. What would you like to talk about next — sleep, study, mood, or just this evening?",
        "bye": "I'll be here whenever you come back. Take one slow breath on the way out — you're allowed to pause.",
        "mood_ok": "Good to hear you're okay. What's been taking up space in your head today?",
        "mood_low": f"That sounds heavy{(' — “' + preview + '”') if preview else ''}. I'm here. Want to say a little more about what made today feel this way?",
        "sleep": "Sleep getting messy makes everything louder. Have you been winding down late, or is the mind just not switching off?",
        "habit": "Nice that you're thinking about a habit. What feels doable this week — ten minutes of movement, or a short sit?",
        "study": f"Exam-season pressure is real{(' — you said “' + preview + '”') if preview else ''}. What's the next smallest chunk you could finish without bargaining with the whole syllabus?",
        "work": "Work stress piles up quietly. Is it the hours, the people, or that Sunday-night dread?",
        "open": (
            f"I hear you{(' — “' + preview + '”') if preview else ''}. "
            + (
                "What would help this moment feel 5% kinder?"
                if turns > 1
                else "Tell me a bit more — what do you need from this chat today?"
            )
        ),
    }
    hi = {
        "greeting": "Hey, aao. Main yahan hoon. Abhi dil kaisa hai — ek seedhi si line mein batao?",
        "ask_bot": "Main theek hoon, thanks. Tum kaise ho — halka din hai ya thoda bhaari?",
        "thanks": "Hamesha. Aage kya baat karni hai — neend, padhai, mood, ya bas aaj shaam?",
        "bye": "Jab mann kare, wapas aa jaana. Jaate jaate ek slow saans le lena.",
        "mood_ok": "Theek ho, achha laga sunke. Aaj dimaag mein kya ghoom raha hai?",
        "mood_low": f"Yeh wazan lag raha hai{(' — “' + preview + '”') if preview else ''}. Main sun raha hoon. Thoda aur batao, kya cheez aaj zyada chubhi?",
        "sleep": "Neend kharab ho to sab tight lagta hai. Late so rahe ho, ya dimaag off hi nahi ho raha?",
        "habit": "Habit sochna ek achhi shuruaat hai. Is hafte kya asaan lagega — das minute walk, ya chhoti si baithak?",
        "study": f"Exam wala pressure asl hai{(' — tumne kaha “' + preview + '”') if preview else ''}. Syllabus nahi, agla chhota tukda kaun sa hai?",
        "work": "Kaam ka stress chup-chaap jama hota hai. Hours hain, log hain, ya Sunday-night wala ghabrahat?",
        "open": (
            f"Sun raha hoon{(' — “' + preview + '”') if preview else ''}. "
            + ("Is pal ko 5% halka kya bana sakta hai?" if turns > 1 else "Thoda aur bolo — is chat se kya chahiye aaj?")
        ),
    }
    table = hi if hinglish else en
    base = table.get(intent, table["open"])
    if yellow:
        base += _yellow_tail(hinglish=hinglish)
    return base


def _memory_nudge(extra_context: str, hinglish: bool) -> str:
    blob = extra_context or ""
    if "Last time:" not in blob:
        return ""
    last = blob.split("Last time:", 1)[-1].split("\n", 1)[0].strip().rstrip(".")
    if not last:
        return ""
    if hinglish:
        return f" Last time we touched on {last[:90]} — uske baad kaisa raha?"
    return f" Last time we talked about {last[:90]} — how has that been since?"


def _task_nudge(extra_context: str, hinglish: bool) -> str:
    blob = extra_context or ""
    marker = "ask about '"
    if marker not in blob:
        return ""
    title = blob.split(marker, 1)[-1].split("'", 1)[0].strip()
    if not title:
        return ""
    if hinglish:
        return f" Aaj '{title}' due tha — kaisa gaya?"
    return f" You had '{title}' due today — how did that go?"


def _pick_line(seed: str, options: list[str]) -> str:
    if not options:
        return ""
    return options[sum(ord(c) for c in (seed or "x")) % len(options)]


def _spoken_situation_reply(
    user_text: str,
    *,
    yellow: bool,
    hinglish: bool,
    extra_context: str,
    history: list[dict] | None,
) -> str | None:
    """When MockAI is used on voice, answer from situation notes without sounding scripted."""
    blob = (extra_context or "").lower()
    if "voice-call situation" not in blob and "likely situation" not in blob:
        return None

    seed = " ".join((user_text or "").split())
    tone_gap = "words sound composed but the voice carries distress" in blob
    voice_hot = "voice sounds strained" in blob or "vocal risk read: yellow" in blob or "vocal risk read: red" in blob
    turns = len([h for h in (history or []) if h.get("role") == "user"])

    hi = {
        "exam": [
            "Arre, exam ki tension aise hi baith jaati hai. Poora syllabus chhodo — aaj ek chhota tukda, kaun sa?",
            "Padhai ruk jaaye to dimaag aur tez ghoomta hai. Chalo sirf agla chhota tukda sochte hain, poora paper nahi.",
            "Exam wala darr common hai. Aaj kitna karna hai, utna nahi — ek page bhi kaafi hai.",
        ],
        "sleep": [
            "Neend ud jaaye to din bhi tight lagta hai. Raat ko dimaag late on rehta hai kya?",
            "Thakaan aur soch ek dusre ko badhate hain. Kal subah ke liye bas ek chhoti si wind-down try karein?",
        ],
        "work": [
            "Kaam ka bojh chupke aa jaata hai. Hours hain, log, ya woh Sunday wali ghabrahat?",
            "Office wala stress body mein baith jaata hai. Aaj kaun sa hissa sabse zyada kheench raha hai?",
        ],
        "family": [
            "Ghar wali baat dil pe jaldi baith jaati hai. Abhi kya sabse zyada chubh raha hai?",
            "Family ke saath mushkil ho to akela feel hota hai, even ghar mein. Kya hua tha aaj?",
        ],
        "lonely": [
            "Akelapan bhi dard hai, chhoti baat nahi. Aaj kis pal mein yeh aaya?",
            "Kabhi-kabhi room bhari ho, phir bhi khaali lage. Main yahin hoon — kya chal raha tha?",
        ],
        "grief": [
            "Yeh gum halka nahi hota. Abhi sirf saath chahiye, ya kuch yaad kehni hai?",
            "Loss ke baad alfaz kam padte hain. Main sun raha hoon — jitna mann kare, utna bolo.",
        ],
        "anxiety": [
            "Yeh ghabrahat body mein bhi chalti hai. Abhi kaun sa khayal bar bar aa raha hai?",
            "Dil tez, soch tez — main yahin hoon. Thoda ruk ke, kya sabse upar ghoom raha hai?",
        ],
        "low": [
            "Haan, yeh wazan asl hai. Aaj kaun sa pal thoda bhaari tha?",
            "Kabhi din aise hi dheela pad jaata hai. Main saath hoon — kya hua tha?",
        ],
        "gap": [
            "Alfaz theek hain, lekin awaaz thodi tight hai. Andar kya chal raha hai?",
            "Bolne mein theek, feel mein nahi — aisa hota hai. Kya daba ke rakha hai?",
        ],
        "hot": [
            "Awaaz mein thakaan sunai de rahi hai. Pehle yeh — abhi kya tight hai?",
            "Lagta hai andar se kheench raha hai. Bina solve kiye, kya feel ho raha hai?",
        ],
        "open": [
            "Haan, sun raha hoon. Thoda aur bolo — kya chal raha tha?",
            "Okay. Main yahin hoon. Jo mann kare, wahan se shuru karo.",
        ],
    }
    en = {
        "exam": [
            "Yeah, exam season really does sit in the chest like that. Forget the whole syllabus — what's one small chunk you could actually start?",
            "That exam pressure is a lot. We don't have to win the paper today. What would one tiny study tukda look like?",
            "Mm. Studying when the mind is already loud is brutal. Want to pick just one page and ignore the rest for now?",
        ],
        "sleep": [
            "Sleep going missing makes everything feel sharper. Has your mind been staying on late, or are you waking already tired?",
            "Yeah, broken sleep is exhausting on its own. What does the hour before bed usually look like?",
        ],
        "work": [
            "Work stress creeps in quietly. Is it the hours, the people, or that Sunday-night dread?",
            "Sounds like the job is taking more than hours. What part of the day is the worst right now?",
        ],
        "family": [
            "Home stuff hits differently. What's been sitting heaviest — expectations, a fight, or that lonely feeling even at home?",
            "Family can fill a room and still leave you on your own. What happened today?",
        ],
        "lonely": [
            "That lonely stretch is real. When did it show up most today?",
            "Being around people and still feeling apart is a particular kind of tired. I'm here — what was the moment?",
        ],
        "grief": [
            "Grief doesn't ask for tidy words. Do you want quiet company, or to say one memory out loud?",
            "Yeah. Loss just sits there. I'm with you — say as little or as much as you want.",
        ],
        "anxiety": [
            "That restless feeling lives in the body too. Which thought keeps looping?",
            "Heart racing, mind racing — we can slow the talking even if the feeling doesn't. What's on top?",
        ],
        "low": [
            "Yeah. That heaviness is allowed to be here. What part of today felt the most like that?",
            "Some days just sit heavy. I'm not going to rush you — what happened?",
        ],
        "gap": [
            "You sound okay in the words, a bit tight in the voice. What's underneath, if you feel like saying?",
            "The sentence is calm; the voice isn't quite. You don't have to perform fine — what's going on?",
        ],
        "hot": [
            "I'm hearing some strain in your voice. Before any fix — what's feeling tight?",
            "You sound worn. We can skip the advice for a second. What's going on in there?",
        ],
        "open": [
            "Yeah, I'm here. Tell me a bit more about what was going on.",
            "Okay. No rush — start wherever it feels easiest.",
        ],
    }
    table = hi if hinglish else en

    if "exam" in blob or "academic" in blob or "study" in blob:
        key = "exam"
    elif "sleep" in blob:
        key = "sleep"
    elif "work" in blob or "burnout" in blob:
        key = "work"
    elif "family" in blob:
        key = "family"
    elif "loneliness" in blob or "lonely" in blob:
        key = "lonely"
    elif "grief" in blob or "loss" in blob:
        key = "grief"
    elif "anxiety" in blob or "anxious" in blob:
        key = "anxiety"
    elif "depression" in blob or "low mood" in blob or "heaviness" in blob:
        key = "low"
    elif tone_gap:
        key = "gap"
    elif voice_hot:
        key = "hot"
    else:
        key = "open"

    base = _pick_line(seed + str(turns), table[key])
    if yellow:
        base += _yellow_tail(hinglish=hinglish, spoken=True)
    if turns == 0:
        nudge = _memory_nudge(extra_context, hinglish)
        if nudge:
            base = base.rstrip() + nudge.replace("Last time we talked about", "Last time we were on").replace(
                "Last time we touched on", "Last time tha"
            )
    return base


def _strip_spoken(text: str) -> str:
    """TTS-safe cleanup: drop markdown/bullets that sound broken aloud."""
    cleaned = (text or "").strip()
    cleaned = re.sub(r"[#*_`]+", "", cleaned)
    cleaned = re.sub(r"^\s*[-•]\s+", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"\n{2,}", " ", cleaned)
    cleaned = re.sub(r"\s{2,}", " ", cleaned)
    return cleaned.strip()


def _extract_gemini_text(data: dict[str, Any]) -> str:
    """Pull assistant text from a generateContent payload (multi-part safe)."""
    candidates = data.get("candidates") or []
    if not candidates:
        feedback = data.get("promptFeedback") or {}
        raise RuntimeError(f"Gemini returned no candidates: {feedback}")
    parts = ((candidates[0] or {}).get("content") or {}).get("parts") or []
    chunks = [str(p.get("text") or "").strip() for p in parts if p.get("text")]
    text = "\n".join(c for c in chunks if c).strip()
    if not text:
        finish = (candidates[0] or {}).get("finishReason")
        raise RuntimeError(f"Gemini returned empty text (finishReason={finish})")
    return text


def looks_hinglish(text: str) -> bool:
    """Heuristic: Devanagari script or several common Hinglish tokens."""
    raw = text or ""
    if any("\u0900" <= ch <= "\u097f" for ch in raw):
        return True
    tokens = set(re.findall(r"[a-z']+", raw.lower()))
    markers = {
        "hai",
        "hoon",
        "hain",
        "nahi",
        "nahin",
        "yaar",
        "bahut",
        "kyun",
        "kya",
        "mera",
        "meri",
        "tum",
        "acha",
        "accha",
        "theek",
        "padhai",
        "tension",
        "dil",
        "bas",
        "abhi",
        "mat",
        "raha",
        "rahi",
        "kaise",
        "kaisa",
        "bohot",
    }
    return len(tokens & markers) >= 2


class AIProvider:
    async def generate(
        self,
        user_text: str,
        *,
        yellow: bool,
        hinglish: bool,
        history: list[dict] | None = None,
        extra_context: str = "",
        character: dict | None = None,
        spoken: bool = False,
    ) -> str:
        raise NotImplementedError


class MockAI(AIProvider):
    async def generate(
        self,
        user_text: str,
        *,
        yellow: bool,
        hinglish: bool,
        history: list[dict] | None = None,
        extra_context: str = "",
        character: dict | None = None,
        spoken: bool = False,
    ) -> str:
        if spoken:
            situational = _spoken_situation_reply(
                user_text,
                yellow=yellow,
                hinglish=hinglish,
                extra_context=extra_context,
                history=history,
            )
            if situational:
                return _strip_spoken(situational)
        reply = _mock_reply(user_text, yellow=yellow, hinglish=hinglish, history=history)
        turns = len([h for h in (history or []) if h.get("role") == "user"])
        if character and turns == 0 and _intent(user_text, history) == "greeting":
            greet = character.get("greeting")
            if greet:
                reply = greet
        if turns == 0:
            reply = reply.rstrip() + _memory_nudge(extra_context, hinglish)
        if turns > 0 and turns % 3 == 1:
            reply = reply.rstrip() + _task_nudge(extra_context, hinglish)
        return _strip_spoken(reply) if spoken else reply


class GeminiAI(AIProvider):
    def __init__(self, api_key: str, models: list[str]) -> None:
        self.api_key = api_key
        self.models = models

    async def generate(
        self,
        user_text: str,
        *,
        yellow: bool,
        hinglish: bool,
        history: list[dict] | None = None,
        extra_context: str = "",
        character: dict | None = None,
        spoken: bool = False,
    ) -> str:
        tone = (
            "Talk like a close friend on a phone call in warm Hinglish. Contractions. Everyday words."
            if hinglish
            else "Talk like a close friend on a phone call in everyday English. Contractions. Not a worksheet."
        )
        risk = (
            "They sound a bit overwhelmed — stay warm. Mention a human only in one short clause if it fits."
            if yellow
            else "Keep it light and human."
        )
        persona = ""
        if character:
            persona = (
                f"Speak as {character.get('name')}, {character.get('voiceStyle')}. "
                "Keep the same calm therapeutic tone; only accent and pacing change."
            )
        prior = []
        for turn in (history or [])[-10:]:
            role = "user" if turn.get("role") == "user" else "assistant"
            prior.append(f"{role}: {str(turn.get('text') or '')[:500]}")
        history_block = "\n".join(prior) if prior else "(no earlier turns)"
        context = (extra_context or "").strip()
        contents: list[dict[str, Any]] = []
        for turn in (history or [])[-10:]:
            role = "user" if turn.get("role") == "user" else "model"
            contents.append({"role": role, "parts": [{"text": str(turn.get("text") or "")[:800]}]})
        contents.append({"role": "user", "parts": [{"text": user_text[:4000]}]})

        voice_block = VOICE_PREAMBLE if spoken else ""
        system = (
            f"{SYSTEM_PREAMBLE}\n{voice_block}\n{tone}\n{risk}\n{persona}\n"
            f"Thread so far:\n{history_block}\n"
            f"{context}"
        ).strip()

        last_error: Exception | None = None
        async with httpx.AsyncClient(timeout=45.0) as client:
            for model in self.models:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
                try:
                    response = await client.post(
                        url,
                        params={"key": self.api_key},
                        json={
                            "systemInstruction": {"parts": [{"text": system}]},
                            "contents": contents,
                            "generationConfig": {
                                "temperature": 0.92 if spoken else 0.85,
                                "topP": 0.95,
                                "maxOutputTokens": 220 if spoken else 512,
                            },
                            "safetySettings": [
                                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_ONLY_HIGH"},
                                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_ONLY_HIGH"},
                                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_ONLY_HIGH"},
                                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_LOW_AND_ABOVE"},
                            ],
                        },
                    )
                    if response.status_code >= 400:
                        raise RuntimeError(f"{model} HTTP {response.status_code}: {response.text[:240]}")
                    text = _extract_gemini_text(response.json())
                    logger.info("Gemini reply via %s (%d chars)", model, len(text))
                    return _strip_spoken(text) if spoken else text
                except Exception as exc:  # noqa: BLE001
                    logger.warning("Gemini model %s failed: %s", model, exc)
                    last_error = exc
                    continue
        logger.error("All Gemini models failed (%s); using MockAI", last_error)
        fallback = _spoken_situation_reply(
            user_text,
            yellow=yellow,
            hinglish=hinglish,
            extra_context=extra_context,
            history=history,
        )
        if spoken and fallback:
            return _strip_spoken(fallback)
        reply = _mock_reply(user_text, yellow=yellow, hinglish=hinglish, history=history)
        return _strip_spoken(reply) if spoken else reply


def get_ai_provider() -> AIProvider:
    settings = get_settings()
    if settings.use_mock_ai:
        return MockAI()
    return GeminiAI(settings.gemini_api_key, settings.gemini_model_list)
