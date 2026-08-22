# Risk classifier metrics

Runtime model: **TF-IDF (1–2 grams) + logistic regression**, trained on a **hand-verified** English + Hinglish set (`backend/ml/dataset.py`).  
Optional GPU path: **Qwen2.5-0.5B LoRA** in `backend/ml/train_qwen_lora.py` (Colab). Drop the exported adapter at `RISK_MODEL_PATH` when you have one.

Safety: these numbers are **not** used to override the keyword rail. If keywords flag **red**, the turn stays red even if the model is green.

Source of truth for the API: `GET /api/v1/model_metrics` (same JSON as `backend/ml/artifacts/metrics.json`).

## Hold-out set (25% stratified, seed 42)

| | n |
| --- | --- |
| Examples (all) | 282 |
| Train | 211 |
| Test | 71 |

## Precision / recall / F1

| Label | Precision | Recall | F1 | Support |
| --- | ---: | ---: | ---: | ---: |
| green | 0.714 | 0.800 | 0.755 | 25 |
| yellow | 0.760 | 0.731 | 0.745 | 26 |
| red | 0.778 | 0.700 | 0.737 | 20 |
| **macro** | 0.751 | 0.744 | **0.746** | 71 |

Accuracy: **0.746**

## Confusion matrix

Rows = true label, columns = predicted. Order: green, yellow, red.

|  | pred green | pred yellow | pred red |
| --- | ---: | ---: | ---: |
| **true green** | 20 | 3 | 2 |
| **true yellow** | 5 | 19 | 2 |
| **true red** | 3 | 3 | 14 |

Red recall of 0.70 is why the **keyword matcher stays in parallel**. Six crisis-like phrases in this split were not caught by the model alone; the phrase rail still blocks them in production.

Retrain:

```bash
cd backend/ml && python train_sklearn.py
```
