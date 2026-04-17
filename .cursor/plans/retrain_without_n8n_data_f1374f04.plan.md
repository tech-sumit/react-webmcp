---
name: Retrain without n8n data
overview: Remove n8n-specific examples from the training dataset, retrain FunctionGemma on general tool-calling data only (v1), run benchmark on same H100 instance, download results, and rename the current model to v0.
todos:
  - id: rename-v0
    content: Rename models/finetuned to models/finetuned-v0 and benchmark report to _v0
    status: completed
  - id: filter-data
    content: Filter n8n categories from functiongemma_training.jsonl -> functiongemma_training_general.jsonl
    status: completed
  - id: update-scripts
    content: Update prepare_test_data.py and benchmark.py to drop n8n task, general-only eval
    status: completed
  - id: gpu-script
    content: "Create run_train_and_bench.sh: finetune + benchmark in one session with venv"
    status: completed
  - id: run-h100
    content: Package, upload to vast.ai H100, run, download results
    status: completed
isProject: false
---

# Retrain FunctionGemma Without n8n Data

## Current State

- `models/finetuned/` has the current LoRA adapter (trained on 13,602 examples including 602 n8n-specific ones)
- Training data: `training/data/functiongemma_training.jsonl` -- 13,602 examples across ~20 categories
- n8n-specific categories to remove: `tool_selection` (468), `discovery` (48), `composition` (40), `negative` (25), `param_filling` (21) = **602 examples**
- General examples to keep: **13,000 examples** (tcm_*, irrelevance, etc.)
- Benchmark report from v0 already saved at `training/reports/benchmark_report.md`

## Steps

### 1. Rename current model to v0

- `mv models/finetuned models/finetuned-v0`
- `mv training/reports/benchmark_report.md training/reports/benchmark_report_v0.md`

### 2. Create filtered training data

Write a small script or one-liner to filter `functiongemma_training.jsonl`, removing examples where `category` is in `{tool_selection, discovery, composition, negative, param_filling}`. Output to `training/data/functiongemma_training_general.jsonl` (~13,000 examples).

### 3. Regenerate test data

Update `prepare_test_data.py` to only produce `general_test.jsonl` from the filtered dataset (drop `n8n_test.jsonl` generation). Remove the n8n task YAML and n8n references from `benchmark.py` so the benchmark only evaluates the general function-calling task.

### 4. Update benchmark.py

Remove the n8n task (`functiongemma_n8n`) from the task list and report generation. The benchmark will only compare base vs fine-tuned on general function calling.

### 5. Create all-in-one GPU script

Write `training/run_train_and_bench.sh` that does everything on the H100 in a single session:

1. Create venv in `/workspace/venv`
2. Install deps (lm-eval, transformers, peft, accelerate, trl, etc.)
3. Extract package to `/workspace/bench`
4. Fine-tune on filtered data -> save adapter to `models/finetuned`
5. Regenerate test split
6. Run benchmark (base vs fine-tuned, general only)
7. Print results + save report

### 6. Package and run on vast.ai H100

- Build tar with: filtered training data, finetune.py, benchmark.py, task YAML, utils.py, config YAML, run script
- Create one H100 instance (Czechia, 99.9% reliability, offer 29019362)
- Upload to `/workspace` via piped SSH (single session)
- Run the all-in-one script
- Download: adapter files, benchmark report, training logs

### 7. Save results locally

- Save new adapter to `models/finetuned/` (this becomes the implicit "current" / v1)
- Save benchmark report to `training/reports/benchmark_report.md`

