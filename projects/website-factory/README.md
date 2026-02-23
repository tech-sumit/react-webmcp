# Website Factory

AI-powered automated website generation pipeline. Submits business details via n8n form → enriches with Google Places → generates content (Claude) → builds design spec → generates Astro site (Claude API) → publishes to GitHub Pages with Decap CMS.

## Quick Start

```bash
# 1. Setup (from repo root)
make wf-setup          # Initialize data dir
make wf-import        # Import workflow into n8n
make workflow-enable NAME="Website Factory Pipeline"

# 2. Ensure base template is on GitHub
make wf-push-template
cd projects/website-factory/base-template && git add -A && git commit -m "Base template" && git push -u origin main

# 3. Configure .env
# ANTHROPIC_API_KEY (or OPENCLAW_API_KEY)
# GITHUB_TOKEN
# GITHUB_OWNER=tech-sumit

# 4. Test
make wf-test          # Opens form in browser
```

## Project Structure

| Path | Purpose |
|------|---------|
| `workflow.json` | n8n pipeline (35 nodes) |
| `base-template/` | Astro + Tailwind + Decap CMS scaffold |
| `db/schema.sql` | SQLite schema (reference; workflow uses JSON store) |
| `scripts/setup.sh` | One-time setup (DB, Vault, template verification) |
| `scripts/generate-site.sh` | Claude Code CLI wrapper (standalone use) |
| `scripts/dry-run.sh` | Test content + optional site generation locally |
| `prompts/` | AI prompt templates |

## Data Storage

The workflow uses **file-based JSON storage** at `data/n8n/website-factory/projects.json` (no SQLite in n8n container). Project state is keyed by `project_id`.

## Dry Run (Local Testing)

Test content generation without n8n:

```bash
cd projects/website-factory
ANTHROPIC_API_KEY=your_key ./scripts/dry-run.sh           # Content only
ANTHROPIC_API_KEY=your_key ./scripts/dry-run.sh --site     # Content + site gen
```

Output: `/tmp/website-factory-dry-run/content.json` and optionally `site-files.json`.

## Makefile Targets

| Target | Description |
|--------|-------------|
| `make wf-setup` | Initialize data dir, copy scripts |
| `make wf-import` | Import workflow into n8n |
| `make wf-push-template` | Add remote for base template (then commit & push) |
| `make wf-test` | Open form in browser |

## Required Environment Variables

- `ANTHROPIC_API_KEY` — Content + site generation (fallback: OPENCLAW_API_KEY)
- `GITHUB_TOKEN` — Create repos, push code, enable Pages
- `GITHUB_OWNER` — GitHub org/username (default: tech-sumit)

## Optional

- `GOOGLE_PLACES_API_KEY` — Real enrichment (falls back to mock data)
- `SENDGRID_API_KEY` — Client email notifications
