#!/usr/bin/env python3
"""Train the SoulCare risk classifier (TF-IDF + logistic regression).

Qwen2.5-0.5B LoRA is in train_qwen_lora.py for Colab GPUs. This sklearn
artifact is what the API loads at runtime so triage never depends on a GPU.
"""

from __future__ import annotations

import json
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix, precision_recall_fscore_support
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
import joblib

from dataset import rows

ROOT = Path(__file__).resolve().parent
ART = ROOT / "artifacts"
DATA = ROOT / "data"


def main() -> None:
    ART.mkdir(parents=True, exist_ok=True)
    DATA.mkdir(parents=True, exist_ok=True)
    examples = rows()
    csv_path = DATA / "risk_dataset.csv"
    csv_path.write_text(
        "text,label,lang,verified,source\n"
        + "\n".join(
            f"\"{r['text'].replace(chr(34), chr(39))}\",{r['label']},{r['lang']},{str(r['verified']).lower()},{r['source']}"
            for r in examples
        )
        + "\n",
        encoding="utf-8",
    )

    texts = [r["text"] for r in examples]
    labels = [r["label"] for r in examples]
    x_train, x_test, y_train, y_test = train_test_split(
        texts, labels, test_size=0.25, random_state=42, stratify=labels
    )
    pipe = Pipeline(
        [
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1, lowercase=True)),
            (
                "clf",
                LogisticRegression(max_iter=400, class_weight="balanced", C=2.0),
            ),
        ]
    )
    pipe.fit(x_train, y_train)
    y_pred = pipe.predict(x_test)
    labels_order = ["green", "yellow", "red"]
    prec, rec, f1, support = precision_recall_fscore_support(
        y_test, y_pred, labels=labels_order, zero_division=0
    )
    report = classification_report(y_test, y_pred, labels=labels_order, zero_division=0, output_dict=True)
    matrix = confusion_matrix(y_test, y_pred, labels=labels_order).tolist()
    metrics = {
        "backend": "sklearn_tfidf_logreg",
        "notes": (
            "Runtime artifact trained on the verified English+Hinglish set. "
            "Qwen2.5-0.5B LoRA (train_qwen_lora.py) can replace this file when a GPU adapter is exported."
        ),
        "n_examples": len(examples),
        "n_train": len(x_train),
        "n_test": len(x_test),
        "labels": labels_order,
        "precision": {k: round(float(v), 3) for k, v in zip(labels_order, prec)},
        "recall": {k: round(float(v), 3) for k, v in zip(labels_order, rec)},
        "f1": {k: round(float(v), 3) for k, v in zip(labels_order, f1)},
        "support": {k: int(v) for k, v in zip(labels_order, support)},
        "confusion_matrix": {"order": labels_order, "matrix": matrix},
        "classification_report": report,
        "macro_f1": round(float(report["macro avg"]["f1-score"]), 3),
    }
    joblib.dump(pipe, ART / "risk_clf.joblib")
    (ART / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(json.dumps({k: metrics[k] for k in ("n_examples", "macro_f1", "precision", "recall", "f1")}, indent=2))


if __name__ == "__main__":
    main()
