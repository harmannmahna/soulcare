"""Load the trained risk classifier. Falls back to None if artifacts missing.

Order:
1. LoRA adapter directory (Qwen2.5-0.5B or DistilBERT) if RISK_MODEL_PATH or artifacts/lora_adapter
2. sklearn TF-IDF + logistic regression joblib (always shipped)
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

LABELS = ("green", "yellow", "red")
ID2LABEL = {0: "green", 1: "yellow", 2: "red"}
DEFAULT_PATH = Path(__file__).resolve().parents[2] / "ml" / "artifacts" / "risk_clf.joblib"
ADAPTER_PATH = Path(__file__).resolve().parents[2] / "ml" / "artifacts" / "lora_adapter"
METRICS_PATH = Path(__file__).resolve().parents[2] / "ml" / "artifacts" / "metrics.json"


def _is_adapter(path: Path) -> bool:
    return path.is_dir() and (
        (path / "adapter_config.json").exists() or (path / "config.json").exists()
    )


@lru_cache
def load_pipeline(path: str | None = None):
    target = Path(path) if path else DEFAULT_PATH
    if not target.exists() or target.is_dir():
        return None
    try:
        import joblib

        return joblib.load(target)
    except Exception:  # noqa: BLE001
        return None


@lru_cache
def load_lora(path: str | None = None):
    target = Path(path) if path else ADAPTER_PATH
    if not _is_adapter(target):
        return None
    try:
        from peft import PeftModel
        from transformers import AutoModelForSequenceClassification, AutoTokenizer
        import torch

        tok = AutoTokenizer.from_pretrained(str(target), trust_remote_code=True)
        base_name = "distilbert-base-uncased"
        cfg = {}
        adapter_cfg = target / "adapter_config.json"
        if adapter_cfg.exists():
            cfg = json.loads(adapter_cfg.read_text(encoding="utf-8"))
            base_name = cfg.get("base_model_name_or_path") or base_name
        if tok.pad_token is None:
            tok.pad_token = tok.eos_token or tok.unk_token
        model = AutoModelForSequenceClassification.from_pretrained(
            base_name, num_labels=3, trust_remote_code=True
        )
        model = PeftModel.from_pretrained(model, str(target))
        model.eval()
        return tok, model, torch
    except Exception:  # noqa: BLE001
        return None


def predict_proba(text: str, path: str | None = None) -> dict | None:
    if not (text or "").strip():
        return None
    lora_path = path if path and Path(path).is_dir() else None
    bundle = load_lora(lora_path)
    if bundle:
        tok, model, torch = bundle
        try:
            enc = tok(text, return_tensors="pt", truncation=True, max_length=96, padding=True)
            with torch.no_grad():
                logits = model(**enc).logits[0]
                probs = torch.softmax(logits, dim=-1).tolist()
            mapping = {ID2LABEL[i]: float(p) for i, p in enumerate(probs)}
            label = max(mapping, key=mapping.get)
            return {
                "label": label,
                "confidence": round(mapping[label], 4),
                "probs": {k: round(mapping.get(k, 0.0), 4) for k in LABELS},
                "backend": "lora_peft",
            }
        except Exception:  # noqa: BLE001
            pass

    pipe = load_pipeline(None if (path and Path(path).is_dir()) else path)
    if pipe is None:
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
