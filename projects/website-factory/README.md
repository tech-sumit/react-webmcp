# Website Factory

AI-powered automated website generation pipeline with integrated Google Maps scraping, existing website analysis, and Claude Vision image classification.

**Pipeline:** Job config (with optional Google Maps URL) → scrape business data & photos → analyze existing website → classify images with AI → generate content (Claude) → **design system** (Claude — fonts, layout signature, motion, tokens merged into `site.json`) → design-spec markdown (`design-spec.md`) + image assignments → generate Astro site (Claude API, JSON file map) → validate → publish to GitHub Pages with Pages CMS at `cms.panditai.org`.

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
# ANTHROPIC_API_KEY (or NEMOCLAW_API_KEY)
# GITHUB_TOKEN
# GITHUB_OWNER=tech-sumit

# 4. Run a job
cd projects/website-factory
./scripts/run-job.sh jobs/mafia-family-kitchen.json            # Full pipeline
./scripts/run-job.sh jobs/mafia-family-kitchen.json --dry-run  # Skip GitHub push
```

## Pipeline Steps

| Step | Script | Description |
|------|--------|-------------|
| 1 | `scrape-gmaps.sh` | Scrape Google Maps listing via Docker (`gosom/google-maps-scraper`) — extracts business data, photos, reviews, hours |
| 2 | `scrape-website.sh` | Analyze existing website — extract nav, colors, content, images |
| 3 | `classify-images.sh` | Classify all images with Claude Vision — category, quality score, placement recommendations |
| 4 | `run-job.sh` | Generate content via Claude API (enriched with real data and image manifest) |
| 5 | `run-job.sh` | Build design system (Claude API) → merge `design` into `content.json`; render `design-spec.md` + image placement notes |
| 6 | `run-job.sh` | Generate Astro components via Claude API (JSON map of paths → source; honors `design` tokens) |
| 7 | `run-job.sh` | Validate (files, imports, image references) |
| 8 | `run-job.sh` | Push to GitHub + enable GitHub Pages |

Steps 1-3 are conditional — they only run when `google_maps_url` or `existing_website` are in the job config. Without them, the pipeline skips to step 4.

## Job Config Schema

```json
{
  "project_id": "unique-id",
  "business_name": "My Business",
  "repo_slug": "my-business",
  "category": "restaurant",
  "style_preset": "modern-dark",
  "primary_color": "#B91C1C",
  "google_maps_url": "https://www.google.com/maps/place/...",
  "existing_website": "https://mybusiness.com",
  "skip_scrape": false,
  "description": "Business description...",
  "address": "123 Main St",
  "extra_context": "Additional instructions for AI...",
  "extra_components": "- src/components/Menu.astro",
  "design": { "heading_font": "Playfair Display", "layout_signature": "editorial_split" },
  "design_spec": "Manual override for design-spec.md (optional; skips AI design + render)"
}
```

Key fields: `google_maps_url` triggers Google Maps scraping, `existing_website` triggers website analysis, `skip_scrape` bypasses both. Optional `design` merges into `content/site.json` (skips the design-system API call if `heading_font` is set). Optional `design_spec` replaces the generated `design-spec.md` entirely.

## Project Structure

| Path | Purpose |
|------|---------|
| `scripts/run-job.sh` | Main 8-step pipeline |
| `scripts/build-design-system-prompt.py` | Builds Claude prompts for the design-system step |
| `scripts/apply-design-system.py` | Parses design API response → merges `design` into `content.json` |
| `scripts/render-design-spec.py` | Renders `design-spec.md` from content + image notes |
| `scripts/scrape-gmaps.sh` | Google Maps scraper (Docker wrapper) |
| `scripts/scrape-website.sh` | Existing website analyzer |
| `scripts/classify-images.sh` | Claude Vision image classifier |
| `jobs/*.json` | Job configuration files |
| `base-template/` | Astro + Tailwind scaffold with `.pages.yml` for Pages CMS |
| `workflow.json` | n8n pipeline (includes design-system + codegen nodes) |
| `prompts/` | AI prompt templates (`content-generation.md`, `design-system.md`, `site-generation.md`, etc.) |

## Data Storage

The workflow uses **file-based JSON storage** at `data/n8n/website-factory/projects.json` (no SQLite in n8n container). Project state is keyed by `project_id`.

## Makefile Targets

| Target | Description |
|--------|-------------|
| `make wf-setup` | Initialize data dir, copy scripts |
| `make wf-import` | Import workflow into n8n |
| `make wf-push-template` | Add remote for base template (then commit & push) |
| `make wf-test` | Open form in browser |

## Required Environment Variables

- `ANTHROPIC_API_KEY` — Content + site generation + image classification (fallback: NEMOCLAW_API_KEY)
- `GITHUB_TOKEN` — Create repos, push code, enable Pages
- `GITHUB_OWNER` — GitHub org/username (default: tech-sumit)

## Optional

- `SENDGRID_API_KEY` — Client email notifications

## Prerequisites

- Docker (for Google Maps scraper)
- `python3`, `curl`, `jq` (for pipeline scripts)
- `npm` (for generating package-lock.json)
