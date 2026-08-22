"""Rule-based vocal-distress score. Additive to text risk — never replaces it.

Client can send Web-Audio features. Optional librosa path if raw samples are given.
Scoring is a weighted combination for hackathon-grade multi-modal triage.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class VocalScore:
    distress: float
    affect: str
    features: dict[str, float]
    backend: str


def score_voice_features(features: dict | None) -> VocalScore | None:
    if not features:
        return None
    try:
        pitch_var = float(features.get("pitch_variance") or features.get("pitchVariance") or 0)
        rate = float(features.get("speech_rate") or features.get("speechRate") or 0)
        pause = float(features.get("pause_ratio") or features.get("pauseRatio") or 0)
    except (TypeError, ValueError):
        return None
    if pitch_var <= 0 and rate <= 0 and pause <= 0:
        return None

    # Flat pitch + slow rate + long pauses → low affect.
    low_affect = 0.0
    if pitch_var and pitch_var < 18:
        low_affect += 0.38
    if rate and rate < 1.6:
        low_affect += 0.28
    if pause and pause > 0.35:
        low_affect += 0.24

    # Pressed speech + high pitch variance → agitation.
    agitated = 0.0
    if pitch_var and pitch_var > 55:
        agitated += 0.34
    if rate and rate > 3.6:
        agitated += 0.32
    if pause and pause < 0.08 and rate > 2.8:
        agitated += 0.2

    distress = min(1.0, max(low_affect, agitated))
    affect = "agitated" if agitated > low_affect else "low_affect" if low_affect >= 0.35 else "neutral"
    return VocalScore(
        distress=round(distress, 3),
        affect=affect,
        features={"pitch_variance": pitch_var, "speech_rate": rate, "pause_ratio": pause},
        backend="rule_librosa_compatible",
    )


def score_samples_librosa(samples: list[float], sr: int = 16000) -> VocalScore | None:
    """Optional path when raw PCM is provided. Safe if librosa is missing."""
    if not samples:
        return None
    try:
        import numpy as np

        y = np.asarray(samples, dtype=float)
        if y.size < sr // 4:
            return None
        try:
            import librosa

            f0 = librosa.yin(y, fmin=60, fmax=400, sr=sr)
            voiced = f0[np.isfinite(f0)]
            pitch_var = float(np.std(voiced)) if voiced.size else 0.0
            onset = librosa.onset.onset_detect(y=y, sr=sr, units="time")
            rate = float(len(onset) / max(len(y) / sr, 0.4))
            rms = librosa.feature.rms(y=y)[0]
            pause = float(np.mean(rms < (np.median(rms) * 0.35)))
        except Exception:  # noqa: BLE001
            pitch_var = float(np.std(y) * 80)
            rate = 2.0
            pause = 0.2
        return score_voice_features(
            {"pitch_variance": pitch_var, "speech_rate": rate, "pause_ratio": pause}
        )
    except Exception:  # noqa: BLE001
        return None


def blend_vocal_into_risk(result: Any, vocal: VocalScore | None):
    """Escalate yellow/red using voice. Never downgrade keyword/model red."""
    if vocal is None or not result:
        return result
    from app.services.risk_triage import RED_SAFETY_MESSAGE, INDIA_HELPLINES, RiskResult, RiskTier, ProblemType

    sources = list(result.sources or [])
    if "vocal" not in sources:
        sources.append("vocal")
    if result.tier == RiskTier.RED:
        return RiskResult(
            tier=result.tier,
            problem_type=result.problem_type,
            triggered_rule=result.triggered_rule,
            matched_phrase=result.matched_phrase,
            action=result.action,
            tags=list(result.tags or []),
            safety_message=result.safety_message,
            helplines=list(result.helplines or []),
            model_label=result.model_label,
            model_confidence=result.model_confidence,
            model_probs=result.model_probs,
            sources=sources,
        )
    if vocal.distress >= 0.82:
        return RiskResult(
            tier=RiskTier.RED,
            problem_type=ProblemType.DEPRESSION,
            triggered_rule="vocal_distress",
            matched_phrase=None,
            action="emergency_escalation",
            tags=[],
            safety_message=RED_SAFETY_MESSAGE,
            helplines=list(INDIA_HELPLINES),
            model_label=result.model_label,
            model_confidence=result.model_confidence,
            model_probs=result.model_probs,
            sources=sources,
        )
    if vocal.distress >= 0.55 and result.tier == RiskTier.GREEN:
        return RiskResult(
            tier=RiskTier.YELLOW,
            problem_type=result.problem_type,
            triggered_rule="vocal_agitation_or_flat_affect",
            matched_phrase=None,
            action="companion_plus_therapist_match",
            tags=list(result.tags or []),
            model_label=result.model_label,
            model_confidence=result.model_confidence,
            model_probs=result.model_probs,
            sources=sources,
        )
    return RiskResult(
        tier=result.tier,
        problem_type=result.problem_type,
        triggered_rule=result.triggered_rule,
        matched_phrase=result.matched_phrase,
        action=result.action,
        tags=list(result.tags or []),
        safety_message=result.safety_message,
        helplines=list(result.helplines or []),
        model_label=result.model_label,
        model_confidence=result.model_confidence,
        model_probs=result.model_probs,
        sources=sources,
    )
