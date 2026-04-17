# PageIndex — System Analysis

## System Summary

PageIndex is a **vectorless, reasoning-based Retrieval-Augmented Generation (RAG)** system created by [Vectify AI](https://vectify.ai). It transforms long PDF and Markdown documents into hierarchical tree indexes — structured like a table of contents — and uses LLM-driven tree search for retrieval instead of vector similarity search.

**The core problem it solves:** Traditional vector-based RAG relies on semantic *similarity*, but similarity does not equal *relevance*. Fixed-size chunking destroys natural document structure, and vector search is opaque and hard to interpret. PageIndex replaces all of this with a system that mimics how a human expert navigates a document — by reasoning over its structural hierarchy.

**Key differentiators:**

- No vector database required
- No fixed-size chunking — documents are organized into natural sections
- Retrieval is reasoning-based, traceable, and interpretable
- Achieved 98.7% accuracy on the FinanceBench benchmark (via Mafin 2.5)

**Target documents:** Financial reports, regulatory filings, academic textbooks, legal/technical manuals, and any long professional document that exceeds LLM context limits.

---

## How It Works

PageIndex operates in two phases: **indexing** (build the tree) and **retrieval** (search the tree). This repository implements the indexing phase. Retrieval is demonstrated in the cookbooks and available via the hosted API/MCP.

### Phase 1: Tree Index Generation

#### PDF Pipeline

The PDF pipeline (`pageindex/page_index.py`, ~1144 lines) performs the following steps:

```
PDF file
  → Parse pages (PyMuPDF / PyPDF2)
  → Detect table of contents in first N pages
  → Choose processing mode based on TOC detection
  → LLM extracts/generates hierarchical structure
  → Verify section→page mappings via LLM
  → Auto-correct incorrect mappings (up to 3 retries)
  → Build tree, recursively subdivide large nodes
  → Optionally add: node IDs, summaries, doc description, full text
  → Output JSON tree structure
```

**Step-by-step breakdown:**

1. **PDF Parsing** — `get_page_tokens()` uses PyMuPDF (with PyPDF2 fallback) to extract text from every page, producing a list of `(page_text, token_count)` tuples.

2. **TOC Detection** — `check_toc()` / `find_toc_pages()` scan the first N pages (default 20) for a table of contents. The LLM determines whether a TOC exists and whether it contains page numbers.

3. **Processing Mode Selection** — Based on TOC detection, one of three modes is chosen:
   - `process_toc_with_page_numbers` — TOC found with page references. The LLM maps TOC entries directly to physical pages.
   - `process_toc_no_page_numbers` — TOC found but without page numbers. The LLM scans document text to locate each section.
   - `process_no_toc` — No TOC detected. The LLM generates the structure from scratch by reading the document pages.

4. **LLM Structure Extraction** — Multiple specialized LLM calls handle different aspects:
   - `toc_transformer` — Converts raw TOC text into structured JSON.
   - `toc_index_extractor` — Maps section titles to physical page numbers.
   - `generate_toc_init` / `generate_toc_continue` — Generates structure when no TOC exists, processing pages in windows.

5. **Verification** — `verify_toc()` randomly samples (or checks all) section→page mappings by asking the LLM to confirm whether a section title actually appears on the claimed page. Computes an accuracy score.

6. **Correction** — If accuracy is below 100%, `fix_incorrect_toc_with_retries()` takes each incorrect mapping, finds the bounding pages from neighboring correct entries, and asks the LLM to re-locate the section within that range. Retries up to 3 times.

7. **Fallback Cascade** — If accuracy drops below 60%, the system falls back to the next processing mode: `with_page_numbers` → `no_page_numbers` → `no_toc`.

8. **Post-Processing** — `post_processing()` and `list_to_tree()` convert the flat section list into a nested tree, computing `start_index` and `end_index` for each node.

9. **Recursive Subdivision** — `process_large_node_recursively()` checks each node against `max_page_num_each_node` (default 10) and `max_token_num_each_node` (default 20000). Oversized nodes are re-processed with `process_no_toc` mode to generate sub-structure.

10. **Enrichment** — Optional passes add:
    - `node_id` — Sequential IDs (e.g., "0001", "0002")
    - `summary` — LLM-generated summary per node
    - `doc_description` — Overall document description
    - `text` — Full text content per node

#### Markdown Pipeline

The Markdown pipeline (`pageindex/page_index_md.py`, ~339 lines) is simpler since Markdown already has explicit hierarchy:

```
Markdown file
  → Parse headers (# levels) → flat node list
  → Extract text content per section
  → (Optional) Tree thinning — merge small nodes
  → Build nested tree from flat list
  → (Optional) Generate summaries via LLM
  → Output JSON tree structure
```

1. **Header Parsing** — `extract_nodes_from_markdown()` uses regex to find `#`-level headers, respecting code blocks.
2. **Content Extraction** — `extract_node_text_content()` assigns text between headers to each node.
3. **Tree Thinning** — `tree_thinning_for_index()` optionally merges nodes below a token threshold (default 5000) into their parent.
4. **Tree Building** — `build_tree_from_nodes()` constructs the nested hierarchy from the flat header list.
5. **Summaries** — `generate_summaries_for_structure_md()` generates LLM summaries concurrently for all nodes.

### Phase 2: Tree Search Retrieval

Retrieval (demonstrated in cookbooks, not in core library) works by:

1. Present the tree index to an LLM along with the user's query.
2. The LLM reasons over the tree structure to identify the most relevant sections.
3. Retrieve full text from those sections (using `start_index`/`end_index`).
4. Feed retrieved context into the LLM for final answer generation.

This is analogous to how a human would scan a table of contents, reason about which sections are relevant, then read those sections.

---

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     run_pageindex.py                        │
│                    (CLI Entry Point)                        │
│         Parses args, dispatches to PDF or MD pipeline       │
└───────────────┬─────────────────────────┬───────────────────┘
                │                         │
        ┌───────▼───────┐         ┌───────▼───────────┐
        │ page_index.py │         │ page_index_md.py  │
        │  PDF Pipeline │         │   MD Pipeline     │
        │  (~1144 loc)  │         │   (~339 loc)      │
        └───────┬───────┘         └───────┬───────────┘
                │                         │
                └──────────┬──────────────┘
                           │
                   ┌───────▼───────┐
                   │   utils.py    │
                   │  (~712 loc)   │
                   │               │
                   │ • OpenAI API  │
                   │ • PDF parsing │
                   │ • Token count │
                   │ • JSON extract│
                   │ • Tree utils  │
                   │ • Config load │
                   │ • Logging     │
                   └───────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼────┐ ┌────▼────┐ ┌─────▼─────┐
        │ OpenAI   │ │ PyMuPDF │ │ tiktoken  │
        │ API      │ │ PyPDF2  │ │           │
        └──────────┘ └─────────┘ └───────────┘
```

### File Structure

```
external/PageIndex/
├── run_pageindex.py              # CLI entry point
├── requirements.txt              # Python dependencies
├── .env                          # CHATGPT_API_KEY (gitignored)
│
├── pageindex/                    # Core package
│   ├── __init__.py               # Exports: page_index_main, md_to_tree, config
│   ├── page_index.py             # PDF → tree pipeline
│   ├── page_index_md.py          # Markdown → tree pipeline
│   ├── utils.py                  # Shared utilities
│   └── config.yaml               # Default configuration
│
├── cookbook/                      # Example notebooks
│   ├── pageindex_RAG_simple.ipynb        # Basic vectorless RAG
│   ├── vision_RAG_pageindex.ipynb        # Vision-based RAG (no OCR)
│   ├── pageIndex_chat_quickstart.ipynb   # Chat interface
│   └── agentic_retrieval.ipynb           # Agentic retrieval
│
├── tests/
│   ├── pdfs/                     # Sample PDF documents
│   └── results/                  # Generated tree JSON outputs
│
└── scripts/                      # GitHub automation scripts
```

### Output Schema

The generated tree structure follows this JSON schema:

```json
{
  "doc_name": "document.pdf",
  "doc_description": "(optional) Overall document description",
  "structure": [
    {
      "title": "Section Title",
      "node_id": "0001",
      "start_index": 1,
      "end_index": 5,
      "summary": "LLM-generated section summary",
      "nodes": [
        {
          "title": "Subsection Title",
          "node_id": "0002",
          "start_index": 1,
          "end_index": 3,
          "summary": "Subsection summary"
        }
      ]
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Section heading |
| `node_id` | string | Sequential ID (e.g., "0001") |
| `start_index` | int | First page of section (1-indexed) |
| `end_index` | int | Last page of section (exclusive) |
| `summary` | string | LLM-generated summary |
| `nodes` | array | Child sections (recursive) |
| `text` | string | Full text content (optional) |

### Data Flow: PDF Processing

```
                        ┌──────────┐
                        │ PDF File │
                        └────┬─────┘
                             │
                     ┌───────▼────────┐
                     │ get_page_tokens│  PyMuPDF / PyPDF2
                     │ Extract text   │
                     └───────┬────────┘
                             │
                  [(page_text, token_count), ...]
                             │
                     ┌───────▼────────┐
                     │  check_toc()   │  LLM: "Is there a TOC?"
                     └───────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     TOC + page nums    TOC, no nums     No TOC
              │              │              │
    ┌─────────▼──────┐ ┌─────▼─────┐ ┌─────▼──────────┐
    │ toc_transformer│ │toc_index_ │ │generate_toc_   │
    │ + toc_index_   │ │extractor  │ │init/continue   │
    │   extractor    │ │(scan text)│ │(LLM generates) │
    └─────────┬──────┘ └─────┬─────┘ └─────┬──────────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
                   flat list: [{title, physical_index}, ...]
                             │
                     ┌───────▼────────┐
                     │  verify_toc()  │  LLM samples N entries
                     └───────┬────────┘
                             │
                    accuracy < 100%?
                             │
                     ┌───────▼────────┐
                     │fix_incorrect_  │  LLM re-locates sections
                     │toc_with_retries│  (up to 3 attempts)
                     └───────┬────────┘
                             │
                    accuracy < 60%?  → fallback to next mode
                             │
                     ┌───────▼────────┐
                     │post_processing │  flat list → nested tree
                     │+ list_to_tree  │  compute start/end indices
                     └───────┬────────┘
                             │
                     ┌───────▼──────────────┐
                     │process_large_node_   │  recursively split
                     │recursively           │  oversized nodes
                     └───────┬──────────────┘
                             │
                     ┌───────▼────────┐
                     │  Enrichment    │  node IDs, summaries,
                     │  (optional)    │  doc description, text
                     └───────┬────────┘
                             │
                     ┌───────▼────────┐
                     │  JSON Output   │
                     │  ./results/    │
                     └────────────────┘
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Language | Python 3.x | Core runtime |
| LLM | OpenAI API (gpt-4o-2024-11-20) | Structure extraction, verification, summaries |
| PDF Parsing | PyMuPDF 1.26.4, PyPDF2 3.0.1 | Text extraction from PDF pages |
| Tokenization | tiktoken 0.11.0 | Token counting for node size management |
| Configuration | PyYAML 6.0.2 | Default config loading |
| Environment | python-dotenv 1.1.0 | API key management |

### Configuration

Default values from `pageindex/config.yaml`:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `model` | gpt-4o-2024-11-20 | OpenAI model for all LLM calls |
| `toc_check_page_num` | 20 | Pages to scan for TOC detection |
| `max_page_num_each_node` | 10 | Threshold for recursive node splitting (pages) |
| `max_token_num_each_node` | 20000 | Threshold for recursive node splitting (tokens) |
| `if_add_node_id` | yes | Add sequential node IDs |
| `if_add_node_summary` | yes | Generate LLM summaries per node |
| `if_add_doc_description` | no | Generate overall document description |
| `if_add_node_text` | no | Include full text in each node |

### Concurrency Model

- LLM calls use Python's `asyncio` with `asyncio.gather()` for concurrent execution.
- Verification checks run in parallel across all sampled sections.
- Correction attempts process all incorrect entries concurrently.
- Summary generation runs concurrently across all nodes.
- Large node recursion processes sibling nodes in parallel.

### Storage

PageIndex is **stateless** — there is no database.

| Artifact | Location | Format |
|----------|----------|--------|
| Tree output | `./results/{docname}_structure.json` | JSON |
| Processing logs | `./logs/` | JSON (via `JsonLogger`) |
| API key | `.env` | `CHATGPT_API_KEY=...` |

### Deployment Options

| Mode | Description |
|------|-------------|
| Self-hosted | Run this repo locally with your own OpenAI API key |
| Cloud — Chat | [chat.pageindex.ai](https://chat.pageindex.ai) |
| Cloud — MCP | [pageindex.ai/mcp](https://pageindex.ai/mcp) |
| Cloud — API | [docs.pageindex.ai](https://docs.pageindex.ai/quickstart) |
| Enterprise | Private/on-prem via Vectify AI |

---

## Usage

### CLI

```bash
# PDF
python3 run_pageindex.py --pdf_path /path/to/document.pdf

# Markdown
python3 run_pageindex.py --md_path /path/to/document.md

# With options
python3 run_pageindex.py --pdf_path doc.pdf \
  --model gpt-4o \
  --max-pages-per-node 15 \
  --if-add-doc-description yes
```

### Programmatic API

```python
from pageindex import page_index, page_index_main, config

# Simple — kwargs interface
result = page_index(doc="report.pdf", model="gpt-4o")

# Advanced — explicit options
opt = config(
    model="gpt-4o-2024-11-20",
    toc_check_page_num=20,
    max_page_num_each_node=10,
    max_token_num_each_node=20000,
    if_add_node_id="yes",
    if_add_node_summary="yes",
    if_add_doc_description="no",
    if_add_node_text="no",
)
result = page_index_main("report.pdf", opt)

# Markdown
import asyncio
from pageindex.page_index_md import md_to_tree
result = asyncio.run(md_to_tree("document.md", if_add_node_summary="yes"))
```
