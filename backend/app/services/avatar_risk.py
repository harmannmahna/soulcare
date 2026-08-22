"""Combine text-triage + Hume vocal tone. Higher severity wins.

Does not change classify_risk() — callers still use that for the transcript.
"""
from __future__ import annotations

from app.services.risk_triage import RiskTier

TIER_RANK = {RiskTier.GREEN: 0, RiskTier.YELLOW: 1, RiskTier.RED: 2}
DISTRESS_LABELS = {
    "distress",
    "anxiety",
    "fear",
    "sadness",
    "horror",
    "pain",
    "anguish",
    "despair",
    "disappointment",
    "grief",
    "awkwardness",
}


def vocal_score_from_emotions(emotions: list[dict] | None) -> float:
    if not emotions:
        return 0.0
    distress = 0.0
    for item in emotions:
        name = str(item.get("name") or "").strip().lower()
        try:
            score = float(item.get("score") or 0)
        except (TypeError, ValueError):
            continue
        if name in DISTRESS_LABELS:
            distress = max(distress, score)
    return round(min(1.0, distress), 3)


def vocal_tier_from_score(score: float) -> RiskTier:
    if score >= 0.65:
        return RiskTier.RED
    if score >= 0.40:
        return RiskTier.YELLOW
    return RiskTier.GREEN


def combine_tiers(text_tier: RiskTier, vocal_tier: RiskTier | None) -> RiskTier:
    if vocal_tier is None:
        return text_tier
    if TIER_RANK[vocal_tier] >= TIER_RANK[text_tier]:
        return vocal_tier
    return text_tier
