#!/usr/bin/env python3
"""Fine-tune Qwen2.5-0.5B with LoRA for SoulCare risk labels.

This is the Colab / GPU path. Runtime still loads sklearn unless you copy
the exported adapter to backend/ml/artifacts/lora_adapter and set
RISK_MODEL_PATH to that folder.

No paid API key is required. Hugging Face may ask you to accept the Qwen
licence in the browser once (free). Optional: HF_TOKEN if downloads are gated.

Colab:
  1. Runtime → Change runtime type → GPU (T4)
  2. Upload backend/ml/data/risk_dataset.csv OR clone the repo
  3. Run this file
  4. Download qwen-risk/adapter/ into the repo as artifacts/lora_adapter
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CSV = ROOT / "data" / "risk_dataset.csv"
OUT = ROOT / "artifacts" / "lora_adapter"


def main() -> None:
    import pandas as pd
    from datasets import Dataset
    from peft import LoraConfig, TaskType, get_peft_model
    from sklearn.metrics import classification_report, confusion_matrix
    from transformers import AutoModelForSequenceClassification, AutoTokenizer, Trainer, TrainingArguments

    model_id = "Qwen/Qwen2.5-0.5B"
    df = pd.read_csv(CSV)
    label2id = {"green": 0, "yellow": 1, "red": 2}
    id2label = {v: k for k, v in label2id.items()}
    df["label_id"] = df["label"].map(label2id)
    tok = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
    if tok.pad_token is None:
        tok.pad_token = tok.eos_token
    model = AutoModelForSequenceClassification.from_pretrained(
        model_id,
        num_labels=3,
        trust_remote_code=True,
        id2label=id2label,
        label2id=label2id,
    )
    model.config.pad_token_id = tok.pad_token_id
    model = get_peft_model(
        model,
        LoraConfig(
            task_type=TaskType.SEQ_CLS,
            r=8,
            lora_alpha=16,
            lora_dropout=0.05,
            target_modules=["q_proj", "v_proj"],
        ),
    )

    def prep(batch):
        enc = tok(batch["text"], truncation=True, padding="max_length", max_length=96)
        enc["labels"] = batch["label_id"]
        return enc

    ds = Dataset.from_pandas(df[["text", "label_id"]]).train_test_split(test_size=0.2, seed=42)
    ds = ds.map(prep, batched=True)
    args = TrainingArguments(
        output_dir=str(ROOT / "artifacts" / "qwen-risk-runs"),
        per_device_train_batch_size=4,
        per_device_eval_batch_size=4,
        num_train_epochs=3,
        learning_rate=2e-4,
        logging_steps=10,
        eval_strategy="epoch",
        save_strategy="epoch",
        report_to=[],
        fp16=True,
    )
    trainer = Trainer(model=model, args=args, train_dataset=ds["train"], eval_dataset=ds["test"], processing_class=tok)
    trainer.train()
    pred = trainer.predict(ds["test"])
    import numpy as np

    y_true = pred.label_ids
    y_hat = np.argmax(pred.predictions, axis=-1)
    labels = ["green", "yellow", "red"]
    y_true_n = [id2label[int(i)] for i in y_true]
    y_hat_n = [id2label[int(i)] for i in y_hat]
    report = classification_report(y_true_n, y_hat_n, labels=labels, output_dict=True, zero_division=0)
    matrix = confusion_matrix(y_true_n, y_hat_n, labels=labels).tolist()
    OUT.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(str(OUT))
    tok.save_pretrained(str(OUT))
    (OUT / "soulcare_metrics.json").write_text(
        json.dumps({"backend": "qwen2.5-0.5b-lora", "report": report, "confusion_matrix": matrix}, indent=2),
        encoding="utf-8",
    )
    print("Saved adapter to", OUT)
    print(json.dumps(report["macro avg"], indent=2))


if __name__ == "__main__":
    main()
