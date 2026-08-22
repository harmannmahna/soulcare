"""Colab / GPU script: LoRA fine-tune Qwen2.5-0.5B on SoulCare risk labels.

This is optional. The API loads sklearn/artifacts/risk_clf.joblib by default
because a 0.5B model needs a GPU (or a slow CPU) and Hugging Face weights.

Run on Colab:
  1. Upload backend/ml/data/risk_dataset.csv
  2. Runtime → GPU
  3. Run this file, then download adapter/ into RISK_MODEL_PATH
"""

from __future__ import annotations

# pip install transformers datasets peft accelerate bitsandbytes pandas scikit-learn

COLAB_SNIPPET = r'''
import pandas as pd
from datasets import Dataset
from peft import LoraConfig, get_peft_model, TaskType
from transformers import AutoModelForSequenceClassification, AutoTokenizer, TrainingArguments, Trainer

MODEL = "Qwen/Qwen2.5-0.5B"
df = pd.read_csv("risk_dataset.csv")
label2id = {"green": 0, "yellow": 1, "red": 2}
df["label_id"] = df["label"].map(label2id)
tok = AutoTokenizer.from_pretrained(MODEL, trust_remote_code=True)
if tok.pad_token is None:
    tok.pad_token = tok.eos_token
model = AutoModelForSequenceClassification.from_pretrained(
    MODEL, num_labels=3, trust_remote_code=True
)
model.config.pad_token_id = tok.pad_token_id
model = get_peft_model(
    model,
    LoraConfig(task_type=TaskType.SEQ_CLS, r=8, lora_alpha=16, lora_dropout=0.05, target_modules=["q_proj", "v_proj"]),
)

def prep(batch):
    enc = tok(batch["text"], truncation=True, padding="max_length", max_length=96)
    enc["labels"] = batch["label_id"]
    return enc

ds = Dataset.from_pandas(df[["text", "label_id"]]).train_test_split(test_size=0.2, seed=42)
ds = ds.map(prep, batched=True)
args = TrainingArguments(
    output_dir="./qwen-risk",
    per_device_train_batch_size=8,
    num_train_epochs=3,
    learning_rate=2e-4,
    logging_steps=10,
    eval_strategy="epoch",
    save_strategy="epoch",
    report_to=[],
)
trainer = Trainer(model=model, args=args, train_dataset=ds["train"], eval_dataset=ds["test"], tokenizer=tok)
trainer.train()
model.save_pretrained("./qwen-risk/adapter")
tok.save_pretrained("./qwen-risk/adapter")
print("Export adapter/ to RISK_MODEL_PATH")
'''

if __name__ == "__main__":
    print(COLAB_SNIPPET)
