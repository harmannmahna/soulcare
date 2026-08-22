#!/usr/bin/env python3
"""DistilBERT + LoRA — CPU/Colab fallback if Qwen2.5-0.5B is too heavy.

Same dataset, same labels. Export to artifacts/lora_adapter.
No API key. Model: distilbert-base-uncased (public on Hugging Face).
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CSV = ROOT / "data" / "risk_dataset.csv"
OUT = ROOT / "artifacts" / "lora_adapter"


def main() -> None:
    import numpy as np
    import pandas as pd
    from datasets import Dataset
    from peft import LoraConfig, TaskType, get_peft_model
    from sklearn.metrics import classification_report, confusion_matrix
    from transformers import AutoModelForSequenceClassification, AutoTokenizer, Trainer, TrainingArguments

    model_id = "distilbert-base-uncased"
    df = pd.read_csv(CSV)
    label2id = {"green": 0, "yellow": 1, "red": 2}
    id2label = {v: k for k, v in label2id.items()}
    df["label_id"] = df["label"].map(label2id)
    tok = AutoTokenizer.from_pretrained(model_id)
    model = AutoModelForSequenceClassification.from_pretrained(
        model_id, num_labels=3, id2label=id2label, label2id=label2id
    )
    model = get_peft_model(
        model,
        LoraConfig(task_type=TaskType.SEQ_CLS, r=8, lora_alpha=16, lora_dropout=0.05, target_modules=["q_lin", "v_lin"]),
    )

    def prep(batch):
        enc = tok(batch["text"], truncation=True, padding="max_length", max_length=96)
        enc["labels"] = batch["label_id"]
        return enc

    ds = Dataset.from_pandas(df[["text", "label_id"]]).train_test_split(test_size=0.2, seed=42)
    ds = ds.map(prep, batched=True)
    args = TrainingArguments(
        output_dir=str(ROOT / "artifacts" / "distilbert-runs"),
        per_device_train_batch_size=8,
        num_train_epochs=3,
        learning_rate=2e-4,
        eval_strategy="epoch",
        save_strategy="epoch",
        report_to=[],
    )
    trainer = Trainer(model=model, args=args, train_dataset=ds["train"], eval_dataset=ds["test"], processing_class=tok)
    trainer.train()
    pred = trainer.predict(ds["test"])
    y_true = [id2label[int(i)] for i in pred.label_ids]
    y_hat = [id2label[int(i)] for i in np.argmax(pred.predictions, axis=-1)]
    labels = ["green", "yellow", "red"]
    report = classification_report(y_true, y_hat, labels=labels, output_dict=True, zero_division=0)
    OUT.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(str(OUT))
    tok.save_pretrained(str(OUT))
    (OUT / "soulcare_metrics.json").write_text(
        json.dumps(
            {
                "backend": "distilbert-lora",
                "report": report,
                "confusion_matrix": confusion_matrix(y_true, y_hat, labels=labels).tolist(),
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print("Saved", OUT)


if __name__ == "__main__":
    main()
