"""Lightweight period + habit-update detectors. No heavy NLP."""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

PERIOD_START = re.compile(
    r"\b(got my period|period started|started my period|my period came|"
    r"period came today|i'?m on my period|on my period today|"
    r"periods? (started|began)|started bleeding)\b",
    re.I,
)
PERIOD_END = re.compile(
    r"\b(period (ended|stopped|is over)|finished my period|period is done)\b",
    re.I,
)

DONE = re.compile(
    r"\b(i (did|finished|completed|wrapped up)|yeah i did|yep i did|"
    r"yes i (did|finished)|done with|marked (it )?done|all done|"
    r"finished it|completed it|i got it done)\b",
    re.I,
)
PARTIAL = re.compile(
    r"\b(half|partially|in progress|started (it|working)|almost|"
    r"not fully|part of it|some of it|finished half)\b",
    re.I,
)
NOT_DONE = re.compile(
    r"\b(not yet|haven'?t|didn'?t (do|finish)|still open|later|"
    r"couldn'?t|no i (didn'?t|haven'?t)|skip(ped)? it)\b",
    re.I,
)

SUGGEST = re.compile(
    r"\b((find|suggest|recommend|match).{0,24}therapist|need a therapist|"
    r"who should i (see|talk to)|book me (a |with a )?therapist)\b",
    re.I,
)
BOOK = re.compile(
    r"\b(book|schedule)\b.{0,36}\b(session|therapist|slot|appointment|dr\.?|doctor|"
    r"ananya|priya|leela|nikhil|meera)\b",
    re.I,
)


def detect_period_mention(text: str) -> str | None:
    raw = (text or "").strip()
    if not raw:
        return None
    if PERIOD_START.search(raw):
        return "start"
    if PERIOD_END.search(raw):
        return "end"
    return None


def parse_task_update_from_reply(text: str) -> str | None:
    raw = (text or "").strip()
    if not raw:
        return None
    if PARTIAL.search(raw):
        return "partial"
    if DONE.search(raw):
        return "done"
    if NOT_DONE.search(raw):
        return "open"
    return None


def wants_therapist_suggest(text: str) -> bool:
    return bool(SUGGEST.search(text or ""))


def wants_booking(text: str) -> bool:
    return bool(BOOK.search(text or ""))


def utc_today() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def habit_log(habit: dict[str, Any]) -> list[dict[str, Any]]:
    return list(habit.get("log") or habit.get("logs") or [])


def habit_is_open_today(habit: dict[str, Any], today: str | None = None) -> bool:
    day = today or utc_today()
    return not any(item.get("date") == day and (item.get("done") or item.get("status") == "done") for item in habit_log(habit))


def habit_title(habit: dict[str, Any]) -> str:
    return str(habit.get("name") or habit.get("title") or "a habit")


def match_habit_from_text(text: str, habits: list[dict[str, Any]]) -> dict[str, Any] | None:
    raw = (text or "").lower()
    if not habits:
        return None
    for habit in habits:
        title = habit_title(habit).lower()
        tokens = [t for t in re.split(r"[^a-z0-9]+", title) if len(t) > 3]
        if title and title in raw:
            return habit
        if tokens and sum(1 for t in tokens if t in raw) >= max(1, len(tokens) // 2):
            return habit
    return habits[0] if parse_task_update_from_reply(text) else None
