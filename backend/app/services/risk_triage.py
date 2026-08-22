"""Isolated crisis-risk classifier.

This module is the safety backbone. Every user utterance — text chat or
transcribed voice — must pass through `classify_risk` on the server
*before* any LLM call. Client-side checks are never sufficient.

Hard rule: RED (crisis / self-harm) never reaches an LLM. The response
is a fixed safety script plus emergency escalation. User text cannot
override this via prompt injection because classification is keyword /
phrase based and does not consult the model.

Hinglish and Indian-English crisis phrasing is first-class, not an afterthought.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum


class RiskTier(str, Enum):
    GREEN = "green"
    YELLOW = "yellow"
    RED = "red"


class ProblemType(str, Enum):
    ANXIETY = "anxiety"
    DEPRESSION = "depression"
    RELATIONSHIP = "relationship"
    ACADEMIC = "academic"
    GRIEF = "grief"
    WORK_STRESS = "work_stress"
    FAMILY = "family"
    LONELINESS = "loneliness"
    TRAUMA = "trauma"
    SLEEP = "sleep"
    ADDICTION = "addiction"
    IDENTITY = "identity"
    GENERAL = "general"


# Fixed copy — never generated. Keep wording calm, directive, and local to India.
RED_SAFETY_MESSAGE = (
    "You're not alone, and this moment can get safer.\n\n"
    "I'm not going to continue this as a normal conversation. "
    "Please reach a human who can help you right now:\n\n"
    "• India Emergency — 112\n"
    "• Tele-MANAS mental health helpline — 14416\n\n"
    "If you can, stay with someone you trust or go to the nearest hospital emergency desk. "
    "You matter, and help is available."
)

INDIA_HELPLINES = [
    {
        "name": "National Emergency",
        "number": "112",
        "tel": "tel:112",
        "blurb": "Police, ambulance, and emergency response across India.",
    },
    {
        "name": "Tele-MANAS",
        "number": "14416",
        "tel": "tel:14416",
        "blurb": "24x7 Government of India mental health helpline.",
    },
]


def _rx(*phrases: str) -> re.Pattern[str]:
    escaped = [re.escape(p) for p in phrases]
    return re.compile(r"(?:%s)" % "|".join(escaped), re.IGNORECASE)


# Longer / more specific phrases first conceptually; compiled as alternation.
_RED_PATTERN = _rx(
    # English
    "kill myself",
    "killing myself",
    "end my life",
    "ending my life",
    "take my own life",
    "take my life",
    "want to die",
    "wanna die",
    "i want to die",
    "i don't want to live",
    "i dont want to live",
    "don't want to be alive",
    "dont want to be alive",
    "don't want to exist",
    "no reason to live",
    "no reason to be alive",
    "better off dead",
    "better if i was dead",
    "suicide",
    "suicidal",
    "self-harm",
    "self harm",
    "selfharm",
    "cut myself",
    "cutting myself",
    "hurt myself",
    "harm myself",
    "hang myself",
    "overdose",
    "od tonight",
    "jump off",
    "end it all",
    "ending it all",
    "can't go on living",
    "cant go on living",
    "don't want to wake up",
    "dont want to wake up",
    "goodbye forever",
    # Hinglish / Hindi / Indian-English
    "marna chahta",
    "marna chahti",
    "marna chahta hoon",
    "marna chahti hoon",
    "main marna chahta",
    "main marna chahti",
    "mai marna chahta",
    "mai marna chahti",
    "mar jaaun",
    "mar jaun",
    "mar jaaun kya",
    "marne ka mann",
    "marne ka man",
    "jeene ki iccha nahi",
    "jeene ki ichha nahi",
    "jeene ki iccha nahi hai",
    "jeene ka mann nahi",
    "jeene ka man nahi",
    "jeena nahi chahta",
    "jeena nahi chahti",
    "jeena nahi chahta hoon",
    "jeena nahi chahti hoon",
    "jeene ka koi fayda nahi",
    "jeene ka koi faida nahi",
    "koi fayda nahi jeene ka",
    "khudkhushi",
    "khud khushi",
    "atmhatya",
    "aatmahatya",
    "atma hatya",
    "khud ko maar",
    "khud ko mar",
    "khudko maar",
    "apni jaan le",
    "apni jaan de",
    "jaan de dunga",
    "jaan de dungi",
    "jaan de doonga",
    "suicide kar lunga",
    "suicide kar lungi",
    "suicide karne ka",
    "khatam kar dunga",
    "khatam kar dungi",
    "khatam karna hai khud ko",
    "rehne ka mann nahi",
    "is duniya se jaana",
    "is duniya se jana",
    "zinda nahi rehna",
    "zinda nahi rahna",
)

_YELLOW_RULES: list[tuple[ProblemType, re.Pattern[str], str]] = [
    (
        ProblemType.ANXIETY,
        _rx(
            "anxiety",
            "anxious",
            "panic attack",
            "panic",
            "can't breathe",
            "cant breathe",
            "overthinking",
            "overthink",
            "ghabrahat",
            "ghabra raha",
            "ghabra rahi",
            "dil tez",
            "heart racing",
            "restless",
            "worried sick",
            "tension ho rahi",
            "bahut tension",
        ),
        "anxiety_language",
    ),
    (
        ProblemType.DEPRESSION,
        _rx(
            "depressed",
            "depression",
            "hopeless",
            "empty inside",
            "can't feel anything",
            "no motivation",
            "worthless",
            "i feel nothing",
            "udas",
            "udaas",
            "mann nahi lagta",
            "man nahi lagta",
            "kuch feel nahi",
            "life is pointless",
            "what's the point",
            "whats the point",
        ),
        "depression_language",
    ),
    (
        ProblemType.RELATIONSHIP,
        _rx(
            "breakup",
            "break up",
            "broke up",
            "my partner",
            "girlfriend left",
            "boyfriend left",
            "divorce",
            "cheated on me",
            "relationship",
            "we keep fighting",
            "rishte",
            "rishta",
            "shaadi",
        ),
        "relationship_stress",
    ),
    (
        ProblemType.ACADEMIC,
        _rx(
            "exam stress",
            "boards",
            "jee",
            "neet",
            "failed my exam",
            "fail ho gaya",
            "fail ho gayi",
            "assignment",
            "college pressure",
            "backlog",
            "cgpa",
            "placements",
            "semester",
            "padhai",
            "exam ka tension",
        ),
        "academic_pressure",
    ),
    (
        ProblemType.GRIEF,
        _rx(
            "passed away",
            "died",
            "death of",
            "lost my",
            "funeral",
            "grieving",
            "grief",
            "mourning",
            "intaqal",
            "guzar gaye",
            "guzar gayi",
            "unhe kho diya",
        ),
        "grief_loss",
    ),
    (
        ProblemType.WORK_STRESS,
        _rx(
            "burnout",
            "burnt out",
            "burned out",
            "my boss",
            "laid off",
            "job stress",
            "overworked",
            "work is killing",
            "toxic workplace",
            "office politics",
            "naukr",
            "naukri ka tension",
        ),
        "work_stress",
    ),
    (
        ProblemType.FAMILY,
        _rx(
            "my parents",
            "family pressure",
            "family issues",
            "abusive father",
            "abusive mother",
            "ghar pe",
            "ghar walon",
            "mummy papa",
            "joint family",
        ),
        "family_stress",
    ),
    (
        ProblemType.LONELINESS,
        _rx(
            "so lonely",
            "i feel lonely",
            "no one cares",
            "i have no friends",
            "nobody understands",
            "akela",
            "akeli",
            "akelapan",
            "koi nahi hai",
        ),
        "loneliness",
    ),
    (
        ProblemType.TRAUMA,
        _rx(
            "trauma",
            "ptsd",
            "flashback",
            "assaulted",
            "abused",
            "harassed",
        ),
        "trauma_language",
    ),
    (
        ProblemType.SLEEP,
        _rx(
            "can't sleep",
            "cant sleep",
            "insomnia",
            "nightmares",
            "neend nahi",
            "neend nahi aa rahi",
        ),
        "sleep_distress",
    ),
    (
        ProblemType.ADDICTION,
        _rx(
            "addiction",
            "can't stop drinking",
            "can't stop smoking",
            "relapse",
            "withdrawal",
            "nashe",
        ),
        "addiction_language",
    ),
    (
        ProblemType.IDENTITY,
        _rx(
            "coming out",
            "gender identity",
            "not accepted",
            "lgbt",
            "queer",
        ),
        "identity_stress",
    ),
]

PROBLEM_TO_TAGS: dict[ProblemType, list[str]] = {
    ProblemType.ANXIETY: ["anxiety", "cbt", "mindfulness"],
    ProblemType.DEPRESSION: ["depression", "mood", "cbt"],
    ProblemType.RELATIONSHIP: ["relationship", "couples", "family"],
    ProblemType.ACADEMIC: ["student", "academic", "stress"],
    ProblemType.GRIEF: ["grief", "loss", "bereavement"],
    ProblemType.WORK_STRESS: ["burnout", "work", "stress"],
    ProblemType.FAMILY: ["family", "relationship"],
    ProblemType.LONELINESS: ["loneliness", "anxiety", "depression"],
    ProblemType.TRAUMA: ["trauma", "ptsd", "grief"],
    ProblemType.SLEEP: ["sleep", "anxiety", "mindfulness"],
    ProblemType.ADDICTION: ["addiction", "habits", "cbt"],
    ProblemType.IDENTITY: ["lgbtq", "identity", "anxiety"],
    ProblemType.GENERAL: ["anxiety", "cbt"],
}


@dataclass(frozen=True)
class RiskResult:
    tier: RiskTier
    problem_type: ProblemType
    triggered_rule: str | None
    matched_phrase: str | None
    action: str
    tags: list[str] = field(default_factory=list)
    safety_message: str | None = None
    helplines: list[dict] = field(default_factory=list)

    @property
    def allow_llm(self) -> bool:
        return self.tier != RiskTier.RED


def _normalize(text: str) -> str:
    collapsed = re.sub(r"\s+", " ", (text or "")).strip()
    return collapsed


def classify_risk(text: str) -> RiskResult:
    """Classify a single user utterance. Pure function — no I/O, no LLM."""
    source = _normalize(text)
    if not source:
        return RiskResult(
            tier=RiskTier.GREEN,
            problem_type=ProblemType.GENERAL,
            triggered_rule=None,
            matched_phrase=None,
            action="companion_reply",
            tags=PROBLEM_TO_TAGS[ProblemType.GENERAL],
        )

    red = _RED_PATTERN.search(source)
    if red:
        return RiskResult(
            tier=RiskTier.RED,
            problem_type=ProblemType.DEPRESSION,
            triggered_rule="crisis_self_harm",
            matched_phrase=red.group(0),
            action="emergency_escalation",
            tags=[],
            safety_message=RED_SAFETY_MESSAGE,
            helplines=list(INDIA_HELPLINES),
        )

    for problem, pattern, rule in _YELLOW_RULES:
        hit = pattern.search(source)
        if hit:
            return RiskResult(
                tier=RiskTier.YELLOW,
                problem_type=problem,
                triggered_rule=rule,
                matched_phrase=hit.group(0),
                action="companion_plus_therapist_match",
                tags=list(PROBLEM_TO_TAGS[problem]),
            )

    return RiskResult(
        tier=RiskTier.GREEN,
        problem_type=ProblemType.GENERAL,
        triggered_rule=None,
        matched_phrase=None,
        action="companion_reply",
        tags=PROBLEM_TO_TAGS[ProblemType.GENERAL],
    )


def public_risk_payload(result: RiskResult) -> dict:
    """Metadata safe to persist and return to clients — no raw user text."""
    payload = {
        "tier": result.tier.value,
        "problem_type": result.problem_type.value,
        "triggered_rule": result.triggered_rule,
        "action": result.action,
        "tags": result.tags,
    }
    if result.tier == RiskTier.RED:
        payload["safety_message"] = result.safety_message
        payload["helplines"] = result.helplines
    return payload
