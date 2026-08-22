"""Load the trained risk classifier. Falls back to None if artifacts missing."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

LABELS = ("green", "yellow", "red")
DEFAULT_PATH = Path(__file__).resolve().parents[2] / "ml" / "artifacts" / "risk_clf.joblib"
METRICS_PATH = Path(__file__).resolve().parents[2] / "ml" / "artifacts" / "metrics.json"


@lru_cache
def load_pipeline(path: str | None = None):
    target = Path(path) if path else DEFAULT_PATH
    if not target.exists():
        return None
    try:
        import joblib

        return joblib.load(target)
    except Exception:  # noqa: BLE001
        return None


def predict_proba(text: str, path: str | None = None) -> dict | None:
    pipe = load_pipeline(path)
    if pipe is None or not (text or "").strip():
        return None
    try:
        probs = pipe.predict_proba([text])[0]
        classes = list(pipe.classes_)
        mapping = {cls: float(p) for cls, p in zip(classes, probs)}
        label = max(mapping, key=mapping.get)
        return {
            "label": label,
            "confidence": round(mapping[label], 4),
            "probs": {k: round(mapping.get(k, 0.0), 4) for k in LABELS},
            "backend": "sklearn_tfidf_logreg",
        }
    except Exception:  # noqa: BLE001
        return None


def load_metrics() -> dict:
    if METRICS_PATH.exists():
        return json.loads(METRICS_PATH.read_text(encoding="utf-8"))
    return {"error": "metrics artifact missing — run python ml/train_sklearn.py"}
