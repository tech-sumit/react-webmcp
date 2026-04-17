---
name: Commit and Publish Article
overview: Commit and push tool_agent code changes to GitHub, then create a detailed technical blog article about fine-tuning FunctionGemma 270M with full benchmarks, architecture diagrams, and a companion LinkedIn post — following the portfolio's article-publishing skill workflow.
todos:
  - id: commit-tool-agent
    content: Commit all tool_agent changes (tests, examples, model.py LoRA, MCP client, a2a fix) and push to origin main
    status: completed
  - id: generate-images
    content: Generate hero image, training pipeline diagram, architecture diagram, benchmark chart, LinkedIn companion image
    status: completed
  - id: write-article
    content: Write full technical article at src/content/posts/finetuning-functiongemma-270m-tool-calling.md with TL;DR, datasets, training, benchmarks, architecture, code snippets
    status: completed
  - id: write-linkedin
    content: Write LinkedIn post at social_posts/linkedIn/finetuning-functiongemma-270m-tool-calling-post.md
    status: completed
  - id: quality-check
    content: Run QUALITY.md checklist on blog post and LinkedIn post
    status: completed
  - id: git-pr
    content: Create branch post/finetuning-functiongemma-270m-tool-calling, commit, push, open PR via gh CLI
    status: completed
isProject: false
---

# Commit tool_agent Code and Publish Fine-tuning Article

## Part 1: Commit and Push tool_agent

**Repo:** `https://github.com/tech-sumit/tool-agent.git` (at [projects/tool_agent](projects/tool_agent))

Files to commit (from `git status`):

- Modified: `agent/model.py` (TransformersBackend LoRA support + FunctionGemma prompt), `agent/protocols/a2a.py` (EventQueue fix), `agent/server.py` (guard n8n tools)
- New: `agent/mcp_client.py`, `tests/conftest.py`, `tests/test_rest.py`, `tests/test_websocket.py`, `tests/test_mcp.py`, `tests/test_a2a.py`, `examples/` (6 example scripts + README)

Single commit covering: protocol tests, example clients, Gemini backend, MCP bridge, TransformersBackend LoRA/FunctionGemma support, and end-to-end evaluation scripts.

Push to `origin main`.

---

## Part 2: Article — "Fine-Tuning FunctionGemma 270M for Tool Calling"

**Slug:** `finetuning-functiongemma-270m-tool-calling`

### Article content outline

1. **TL;DR** — 5-6 key takeaways: fine-tuned 270M model, +29% tool selection (lm-eval), +43% end-to-end, LoRA on H100, 25 min training, published on HuggingFace
2. **The Problem** — Small on-device models can't reliably do function calling. Google's FunctionGemma 270M is promising but the base model produces zero valid tool calls on unseen schemas.
3. **Architecture Overview** — Generated diagram showing:

```
Training Pipeline: Datasets → Convert to FunctionGemma format → LoRA fine-tune on H100 → Benchmark
Deployment: Fine-tuned model → tool_agent (REST/WS/MCP/A2A) → Tool execution
```

1. **Datasets** — Table with sources and sizes:
  - Salesforce/xlam-function-calling-60k (10k sampled)
  - MadeAgents/xlam-irrelevance-7.5k (3k sampled)
  - Categories: toolbench, xlam60k, openfunctions, irrelevance
  - Conversion pipeline: xLAM JSON → FunctionGemma control tokens
2. **Training Setup** — Table with config:
  - Base: `unsloth/functiongemma-270m-it`
  - LoRA: r=16, alpha=32, dropout=0.05, 7 target modules
  - H100 SXM 80GB via vast.ai, 25 min training, 3 epochs
  - Final metrics: train loss 0.6503, eval loss 0.6921, token accuracy 85.7%
3. **Benchmark Results** — Two comparison tables:
  - lm-evaluation-harness: Tool Selection +29%, First Tool +39%, Param Accuracy +20%
  - End-to-end through tool_agent: 14% → 57% tool selection accuracy (7-query eval)
  - Per-query breakdown table
4. **Tool Agent Architecture** — Generated diagram showing multi-protocol server (A2A, MCP, WebSocket, REST) with TransformersBackend loading LoRA adapter
5. **End-to-End Pipeline** — Code snippets showing:
  - LoRA auto-detection in TransformersBackend
  - FunctionGemma prompt format
  - Legacy `<start_function_call>` parsing
  - Test run results
6. **Limitations and Next Steps** — 270M too small for 14+ tools, needs 3B+ for production, GGUF export path
7. **Links** — HuggingFace model, GitHub repo, tool_agent repo

### Generated images (4-5)

1. **Hero image** — stylized "FunctionGemma Fine-Tuning" banner (1200x630)
2. **Training pipeline flowchart** — datasets → conversion → training → benchmarking
3. **Tool agent architecture** — multi-protocol server diagram
4. **Benchmark comparison chart** — base vs fine-tuned bar chart
5. **LinkedIn companion image** — 1200x627

### LinkedIn post

File: `social_posts/linkedIn/finetuning-functiongemma-270m-tool-calling-post.md`

Hook: "What happens when you fine-tune a 270M parameter model for function calling?" Key points with arrows, blog link, GitHub + HuggingFace links, 8-12 hashtags.

### Git/PR workflow (portfolio repo)

1. Branch: `post/finetuning-functiongemma-270m-tool-calling`
2. Files: post `.md`, images in `static/images/posts/<slug>/`, LinkedIn post + image
3. Push and `gh pr create`

