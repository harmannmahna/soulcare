"""Calm close-of-session quotes — no clichés."""

QUOTES = [
    "Rest is not a reward you earn after surviving the day. It is part of staying well.",
    "You do not have to solve everything before you put the phone down.",
    "Small honest check-ins count more than perfect weeks.",
    "Your mind is allowed to be tired. That is information, not failure.",
    "One kind next step is enough for tonight.",
    "The work of caring for yourself can be quiet and still be real.",
]

GOODBYE = "I'll let you go for now. Take care of yourself today."


def rotating_quote(seed: int = 0) -> str:
    if not QUOTES:
        return GOODBYE
    return QUOTES[abs(int(seed)) % len(QUOTES)]
