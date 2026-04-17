---
name: ARC-AGI-1 Beater Setup
overview: Research-first approach to beating ARC-AGI-1. Phase 1 delivers a thorough research report + dataset download scripts. Phase 2 (after review) decides the architecture and builds the training pipeline.
todos:
  - id: research-report
    content: "Create docs/research.md: deep dive into mdlARC architecture (line-by-line how each component works), comparison table of all top ARC-AGI-1 approaches (ARChitects, NVARC, T5-ARC, BARC/MIT, CompressARC, LLMs from OpenAI/Google/Anthropic/Chinese labs), cost-performance tradeoffs, and a recommendations section with concrete improvement paths"
    status: completed
  - id: dataset-scripts
    content: Create scripts/download_datasets.py to clone ARC-AGI-1, ARC-AGI-2, ConceptARC repos and organize JSON files; create scripts/build_datasets.py to produce challenges.json + solutions.json with ARC-2 overlap filtering
    status: completed
  - id: download-datasets
    content: Run the download scripts locally to fetch all datasets into datasets/ and verify the built assets (task counts, no leakage between train/eval)
    status: completed
  - id: minimal-scaffolding
    content: Create .gitignore, basic Makefile (download + build-data targets only), and pyproject.toml with minimal deps for dataset scripts
    status: completed
isProject: false
---

# ARC-AGI-1 Beater

## Goal

Beat ARC-AGI-1 using a transformer architecture. Research first, decide approach based on findings, then build.

## Phase 1: Research + Datasets (current scope)

This phase delivers two things: (1) a thorough research report to inform architecture decisions, and (2) working dataset scripts with downloaded data ready for training.

After Phase 1, we review findings and decide the approach before writing any training code.

### 1A. Research Report (`docs/research.md`)

A deep-dive document covering:

**How mdlARC works (line-by-line understanding)**

- Model architecture: custom Transformer (768d, 12 heads, 3072 FFN, 8 layers, ~75M params)
- 3D RoPE: positional encoding that encodes (x=column, y=row, z=region) where z distinguishes start/input/separator/output/end regions. Head dimensions split across x/y/z. Precomputed for 32x32x8 positions.
- Per-task embeddings: 1280-slot learned embedding summed into token conditioning, gives the model task identity. Critical for performance (removing drops to ~24%).
- Dihedral embeddings: 8 geometric transforms (identity, rot90/180/270, flips) as learned embeddings.
- Tokenization: 14-token vocab (0-9 + 4 special tokens). Grids row-by-row with `<next_line>` separators.
- Training: NorMuon optimizer (Newton-Schulz for Linear weights, AdamW for rest), WSD LR schedule (2% warmup, hold, 80% decay start), supervised on output tokens only, packed varlen batching via Flash Attention (no padding), bfloat16, gradient clip 1.0.
- Augmentation: color permutations (permute colors 1-9, 0 fixed), 8 dihedral transforms, epoch-cycled selection without replacement, deduplication via hashing.
- Evaluation: greedy decode with KV cache, test-time augmentation, AAIVR (Augmentation Inverse Voting and Ranking) -- aggregate predictions across augmented variants, inverse-transform to canonical space, vote by frequency, top-2 for submission.
- Ablations and what they reveal about what matters.

**Top approaches comparison (all methods that score >10% on ARC-AGI-1)**

For each approach, document: method type, model size, training data, score, cost, compute, strengths, weaknesses, open-source availability.

- the ARChitects (53.5%, 2024 Kaggle winner): Mistral-NeMo-Minitron-8B, DFS sampling, Product-of-Experts, test-time finetuning, masked diffusion model
- MindsAI (55.5%, not open-sourced)
- NVARC (2025 winner, ~24% on ARC-2): Qwen3 4B + LoRA, 103K synthetic puzzles, 3.2M augmented, TRM ensemble
- Jeremy Berman (53.6% semi-private): TTT approach
- BARC/MIT (47.5%): combining induction and transduction
- T5-ARC: TTT for transductive transformers, small model from scratch
- mdlARC (44%): cheapest, simplest, no recursion, no synthetic data
- CompressARC (~20%, 76K params): MDL-based per-task inference
- TRM/HRM: Tiny Recursive Models (Samsung), recursive transformer with large task embeddings
- LLMs: OpenAI o3 75-87%, o1-preview 21%, Claude 3.5 Sonnet 21%, GPT-4o 9%, Gemini 1.5 8%, DeepSeek, Qwen

**Recommendations: concrete paths to beat 44%**

Ranked by expected impact vs. effort:

- Scaling (deeper/wider on H100 vs. 5090)
- Ensemble of checkpoint runs (Vakde union of runs -> 55%)
- Architecture improvements (PoPE, attention variants, deeper FFN)
- Hybrid: mdlARC transformer + program synthesis for complementary task coverage
- Test-time training per-task (T5-ARC style) on top of mdlARC base
- Better augmentation or learned augmentation
- Curriculum learning

### 1B. Dataset Download & Build Scripts

**Datasets to acquire:**

- ARC-AGI-1: `github.com/fchollet/ARC-AGI` -- 400 train + 400 eval tasks
- ARC-AGI-2: `github.com/arcprize/ARC-AGI-2` -- 1000 train + 120 eval (347 non-overlapping with ARC-1)
- ConceptARC: `github.com/victorvikram/ConceptARC` -- ~100 concept-oriented tasks
- HuggingFace: `arcprize/arc_agi_v2_public_eval`, `multimodal-reasoning-lab/ARC-AGI` (if useful)

**Scripts (adapted from [references/mdlARC/dataset_building_scripts/](projects/arcAGIBeater/references/mdlARC/dataset_building_scripts/)):**

`scripts/download_datasets.py`:

- Clone all three GitHub repos into `datasets/raw/`
- Group JSON files by split (train/eval) per dataset
- Write intermediate grouped files to `datasets/grouped/`

`scripts/build_datasets.py`:

- Load grouped files, flatten eval test pairs into train for training
- Filter ARC-2 overlap (remove 773 tasks shared with ARC-1 to prevent leakage)
- Optionally add ConceptARC
- Output `assets/challenges.json` and `assets/solutions.json`
- Print stats: task counts per source, total examples, sequence length distribution

**Verification**: Run locally, confirm task counts match expected (400+347+~100 train tasks, 400 eval tasks for scoring).

### 1C. Minimal Scaffolding

Just enough to support the dataset pipeline:

- `.gitignore`: datasets/, assets/, runs/, .firecrawl/, *.pt, **pycache**/
- `pyproject.toml`: minimal deps (numpy, matplotlib for dataset inspection)
- `Makefile`: `download` and `build-data` targets only

### 1D. Directory Structure (Phase 1 only)

```
projects/arcAGIBeater/
├── README.md                    # Existing (light update with dataset instructions)
├── .env                         # ARC_API_KEY (exists)
├── .gitignore
├── Makefile                     # download + build-data targets
├── pyproject.toml               # Minimal deps
├── scripts/
│   ├── download_datasets.py     # Clone ARC repos, organize JSONs
│   └── build_datasets.py        # Build challenges.json + solutions.json
├── docs/
│   └── research.md              # Research report
├── datasets/                    # Raw + grouped downloads (gitignored)
├── assets/                      # Built training data (gitignored)
└── references/
    └── mdlARC/                  # Existing reference (unchanged)
```

---

## Phase 2: Decide Approach (after reviewing research)

After Phase 1 is complete, we review `docs/research.md` together and decide:

- Start with mdlARC as-is and iterate, OR design a new architecture
- Which improvements to prioritize (scaling, ensemble, hybrid, TTT, etc.)
- Training budget and compute strategy (vast.ai H100 instance sizing)

## Phase 3: Build Training Pipeline (after Phase 2 decision)

Deferred until we decide the approach. Will include:

- Core training source code (either adapted mdlARC or new)
- Training configs and entry point
- vast.ai provisioning and training scripts (`run_vastai.sh`)
- Evaluation and ARC Prize submission scripts
- Full Makefile with train/eval/gpu-* targets
- Updated README with full documentation

