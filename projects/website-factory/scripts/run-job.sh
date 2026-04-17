#!/usr/bin/env bash
# ============================================================
# Website Factory — CLI Job Runner (Enhanced Pipeline)
# ============================================================
# Runs the full 8-step pipeline locally:
#   1. Scrape Google Maps (if google_maps_url in job config)
#   2. Analyze existing website (if existing_website in job config)
#   3. Download + classify images with Claude Vision
#   4. Generate content via Claude API (enriched with real data)
#   5. Design system (Claude API) + design-spec.md (image notes + tokens); optional job.design / design_spec overrides
#   6. Generate site code via Claude API (JSON file map)
#   7. Validate
#   8. Push to GitHub + enable Pages
#
# Usage:
#   ./scripts/run-job.sh jobs/cafe-peter.json
#   ./scripts/run-job.sh jobs/cafe-peter.json --dry-run   # skip GitHub push
#
# Required env: ANTHROPIC_API_KEY (or NEMOCLAW_API_KEY), GITHUB_TOKEN, GITHUB_OWNER
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(dirname "$(dirname "$PROJECT_DIR")")"
TEMPLATE_DIR="${PROJECT_DIR}/base-template"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
log()   { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $*"; }
ok()    { echo -e "${GREEN}[$(date +%H:%M:%S)] ✓${NC} $*"; }
warn()  { echo -e "${YELLOW}[$(date +%H:%M:%S)] ⚠${NC} $*"; }
error() { echo -e "${RED}[$(date +%H:%M:%S)] ✗${NC} $*" >&2; }

# ── Load .env ────────────────────────────────────────────────
if [[ -f "${REPO_ROOT}/.env" ]]; then
  set -a; source "${REPO_ROOT}/.env"; set +a
fi

ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-${NEMOCLAW_API_KEY:-}}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
GITHUB_OWNER="${GITHUB_OWNER:-tech-sumit}"

[[ -z "$ANTHROPIC_API_KEY" ]] && { error "ANTHROPIC_API_KEY required"; exit 1; }
[[ -z "$GITHUB_TOKEN" ]]      && { error "GITHUB_TOKEN required"; exit 1; }

# ── Args ─────────────────────────────────────────────────────
JOB_FILE="${1:?Usage: $0 <job-config.json> [--dry-run]}"
DRY_RUN=false
[[ "${2:-}" == "--dry-run" ]] && DRY_RUN=true

[[ ! -f "$JOB_FILE" ]] && { error "Job file not found: $JOB_FILE"; exit 1; }

# ── Parse job config ─────────────────────────────────────────
JOB=$(cat "$JOB_FILE")
BUSINESS_NAME=$(echo "$JOB" | jq -r '.business_name')
REPO_SLUG=$(echo "$JOB" | jq -r '.repo_slug')
CATEGORY=$(echo "$JOB" | jq -r '.category // "generic"')
STYLE_PRESET=$(echo "$JOB" | jq -r '.style_preset // "modern-dark"')
PRIMARY_COLOR=$(echo "$JOB" | jq -r '.primary_color // "#2563EB"')
CLIENT_EMAIL=$(echo "$JOB" | jq -r '.client_email // ""')
PROJECT_ID=$(echo "$JOB" | jq -r '.project_id // empty' || date +%s | shasum | head -c8)
[[ -z "$PROJECT_ID" ]] && PROJECT_ID=$(date +%s | shasum | head -c8)

GOOGLE_MAPS_URL=$(echo "$JOB" | jq -r '.google_maps_url // ""')
EXISTING_WEBSITE=$(echo "$JOB" | jq -r '.existing_website // ""')
SKIP_SCRAPE=$(echo "$JOB" | jq -r '.skip_scrape // false')

WORK_DIR="/tmp/website-factory/${PROJECT_ID}"
SITE_DIR="${WORK_DIR}/site"

TOTAL_STEPS=8

echo ""
echo -e "${BOLD}━━━ Website Factory Job ━━━${NC}"
echo -e "  Business:       ${GREEN}${BUSINESS_NAME}${NC}"
echo -e "  Repo:           ${GITHUB_OWNER}/${REPO_SLUG}"
echo -e "  Category:       ${CATEGORY}"
echo -e "  Style:          ${STYLE_PRESET} / ${PRIMARY_COLOR}"
echo -e "  Project ID:     ${PROJECT_ID}"
echo -e "  Google Maps:    ${GOOGLE_MAPS_URL:-none}"
echo -e "  Existing site:  ${EXISTING_WEBSITE:-none}"
echo -e "  Dry run:        ${DRY_RUN}"
echo ""

mkdir -p "$WORK_DIR"

# ── Step 1: Scrape Google Maps ───────────────────────────────
HAS_GMAPS_DATA=false
if [[ -n "$GOOGLE_MAPS_URL" && "$SKIP_SCRAPE" != "true" ]]; then
  log "Step 1/${TOTAL_STEPS}: Scraping Google Maps..."
  if "${SCRIPT_DIR}/scrape-gmaps.sh" "$GOOGLE_MAPS_URL" "$WORK_DIR"; then
    HAS_GMAPS_DATA=true
    ok "Google Maps data extracted"
  else
    warn "Google Maps scraping failed — continuing without enrichment"
  fi
else
  if [[ -n "$GOOGLE_MAPS_URL" ]]; then
    log "Step 1/${TOTAL_STEPS}: Skipping Google Maps scrape (skip_scrape=true)"
  else
    log "Step 1/${TOTAL_STEPS}: No Google Maps URL — skipping"
  fi
fi

# ── Step 2: Analyze existing website ─────────────────────────
HAS_WEBSITE_DATA=false
if [[ -n "$EXISTING_WEBSITE" && "$SKIP_SCRAPE" != "true" ]]; then
  log "Step 2/${TOTAL_STEPS}: Analyzing existing website..."
  if "${SCRIPT_DIR}/scrape-website.sh" "$EXISTING_WEBSITE" "$WORK_DIR"; then
    HAS_WEBSITE_DATA=true
    ok "Website analysis complete"
  else
    warn "Website analysis failed — continuing without it"
  fi
else
  log "Step 2/${TOTAL_STEPS}: No existing website — skipping"
fi

# ── Step 3: Download + classify images ───────────────────────
HAS_IMAGE_MANIFEST=false
ALL_IMAGES_DIR="${WORK_DIR}/images/all"
mkdir -p "$ALL_IMAGES_DIR"

if [[ "$HAS_GMAPS_DATA" == true || "$HAS_WEBSITE_DATA" == true ]]; then
  log "Step 3/${TOTAL_STEPS}: Merging and classifying images..."

  # Merge images from all sources
  MERGE_COUNT=0
  for src_dir in "${WORK_DIR}/images/gmaps" "${WORK_DIR}/images/website"; do
    if [[ -d "$src_dir" ]]; then
      find "$src_dir" -maxdepth 1 -type f \( -name '*.jpg' -o -name '*.jpeg' -o -name '*.png' -o -name '*.webp' -o -name '*.gif' \) -print0 | while IFS= read -r -d '' img; do
        cp "$img" "$ALL_IMAGES_DIR/"
        MERGE_COUNT=$((MERGE_COUNT + 1))
      done
    fi
  done
  MERGE_COUNT=$(find "$ALL_IMAGES_DIR" -maxdepth 1 -type f \( -name '*.jpg' -o -name '*.jpeg' -o -name '*.png' -o -name '*.webp' -o -name '*.gif' \) | wc -l | tr -d ' ')

  if [[ $MERGE_COUNT -gt 0 ]]; then
    ok "Merged ${MERGE_COUNT} images from all sources"

    if "${SCRIPT_DIR}/classify-images.sh" "$ALL_IMAGES_DIR" "${WORK_DIR}/image-manifest.json"; then
      HAS_IMAGE_MANIFEST=true
      ok "Image classification complete"
    else
      warn "Image classification failed — images will be included without AI placement"
      # Create a basic manifest from filenames
      python3 -c "
import json, os
img_dir = '${ALL_IMAGES_DIR}'
manifest = []
for f in sorted(os.listdir(img_dir)):
    if f.lower().endswith(('.jpg','.jpeg','.png','.webp','.gif')):
        manifest.append({'filename': f, 'category': 'unknown', 'subject': f, 'quality': 5, 'placement': ['gallery'], 'mood': 'neutral'})
json.dump(manifest, open('${WORK_DIR}/image-manifest.json','w'), indent=2)
"
      HAS_IMAGE_MANIFEST=true
    fi
  else
    log "No images found to classify"
  fi
else
  log "Step 3/${TOTAL_STEPS}: No images to classify — skipping"
fi

# ── Build enrichment context for prompts ─────────────────────
GMAPS_CONTEXT=""
if [[ "$HAS_GMAPS_DATA" == true && -f "${WORK_DIR}/gmaps-enrichment.json" ]]; then
  GMAPS_CONTEXT=$(python3 << 'PYEOF'
import json, os

with open(os.path.join(os.environ.get("WORK_DIR", "/tmp"), "gmaps-enrichment.json")) as f:
    d = json.load(f)

lines = ["GOOGLE MAPS DATA (use this real data — it overrides any placeholders):"]
if d.get("rating"):
    lines.append(f"- Rating: {d['rating']} ({d.get('review_count', 0)} reviews)")
if d.get("categories"):
    lines.append(f"- Categories: {', '.join(d['categories'])}")
if d.get("phone"):
    lines.append(f"- Phone: {d['phone']}")
if d.get("address"):
    lines.append(f"- Address: {d['address']}")
if d.get("price_range"):
    lines.append(f"- Price range: {d['price_range']}")
if d.get("hours"):
    hrs = ", ".join(f"{k}: {v}" for k, v in d["hours"].items())
    lines.append(f"- Hours: {hrs}")
if d.get("highlights"):
    lines.append(f"- Highlights: {', '.join(d['highlights'])}")
if d.get("atmosphere"):
    lines.append(f"- Atmosphere: {', '.join(d['atmosphere'])}")
if d.get("offerings"):
    lines.append(f"- Offerings: {', '.join(d['offerings'])}")
if d.get("reservation_links"):
    for rl in d["reservation_links"]:
        lines.append(f"- Reservation ({rl['source']}): {rl['url']}")
if d.get("reviews"):
    lines.append("- Top Reviews:")
    for r in d["reviews"][:5]:
        stars = "★" * r.get("rating", 5)
        lines.append(f'  - "{r["text"][:150]}" — {r["author"]} ({stars})')

print("\n".join(lines))
PYEOF
)
fi

WEBSITE_CONTEXT=""
if [[ "$HAS_WEBSITE_DATA" == true && -f "${WORK_DIR}/website-analysis.json" ]]; then
  WEBSITE_CONTEXT=$(python3 << 'PYEOF'
import json, os

with open(os.path.join(os.environ.get("WORK_DIR", "/tmp"), "website-analysis.json")) as f:
    d = json.load(f)

lines = ["EXISTING WEBSITE ANALYSIS (use as reference for content and design):"]
if d.get("title"):
    lines.append(f"- Title: {d['title']}")
if d.get("description"):
    lines.append(f"- Description: {d['description']}")
if d.get("nav_items"):
    lines.append(f"- Navigation: {', '.join(d['nav_items'])}")
if d.get("colors"):
    lines.append(f"- Color scheme: {', '.join(d['colors'][:6])}")
if d.get("text_content"):
    content = d["text_content"][:800].replace("\n", " ")
    lines.append(f"- Key content: {content}")
if d.get("images"):
    lines.append(f"- Found {len(d['images'])} images on site")

print("\n".join(lines))
PYEOF
)
fi

IMAGE_CONTEXT=""
if [[ "$HAS_IMAGE_MANIFEST" == true && -f "${WORK_DIR}/image-manifest.json" ]]; then
  IMAGE_CONTEXT=$(WORK_DIR="$WORK_DIR" python3 << 'PYEOF'
import json, os

with open(os.path.join(os.environ.get("WORK_DIR", "/tmp"), "image-manifest.json")) as f:
    manifest = json.load(f)

good = [m for m in manifest if m.get("quality", 0) >= 5]
good.sort(key=lambda x: x.get("quality", 0), reverse=True)

lines = ["AVAILABLE IMAGES (with AI classification — use these in the website):"]
hero_candidates = [m for m in good if "hero" in m.get("placement", [])]
gallery = [m for m in good if "gallery" in m.get("placement", [])]
menu_imgs = [m for m in good if m.get("category") in ("food", "drink")]

if hero_candidates:
    h = hero_candidates[0]
    lines.append(f"- HERO IMAGE: images/{h['filename']} ({h.get('subject','')}, quality:{h.get('quality',0)}, mood:{h.get('mood','')})")

for m in good[:15]:
    placements = ", ".join(m.get("placement", []))
    lines.append(f"- images/{m['filename']}: {m.get('category','?')} — {m.get('subject','')}, quality:{m.get('quality',0)}, placements:[{placements}]")

lines.append(f"\nTotal: {len(good)} usable images ({len(hero_candidates)} hero candidates, {len(menu_imgs)} food/drink)")
lines.append("Assign images to hero_image, gallery[].image, and section backgrounds based on the classification data above.")
lines.append("Reference images as 'images/<filename>' — they will be in public/images/ at build time.")

print("\n".join(lines))
PYEOF
)
fi

# ── Step 4: Generate content via Claude API ──────────────────
log "Step 4/${TOTAL_STEPS}: Generating content via Claude API..."

CONTENT_PROMPT=$(echo "$JOB" | jq -r '.content_prompt // empty')
if [[ -z "$CONTENT_PROMPT" ]]; then
  DESCRIPTION=$(echo "$JOB" | jq -r '.description // "No description provided"')
  EXTRA_CONTEXT=$(echo "$JOB" | jq -r '.extra_context // ""')
  EXTRA_SECTIONS=$(echo "$JOB" | jq -r '.extra_sections // ""')

  CONTENT_PROMPT="Generate complete website content for the following business.

BUSINESS DATA:
- Name: ${BUSINESS_NAME}
- Category: ${CATEGORY}
- Description: ${DESCRIPTION}
- Style: ${STYLE_PRESET}, Primary Color: ${PRIMARY_COLOR}
$(echo "$JOB" | jq -r 'if .address then "- Address: " + .address else "" end')
$(echo "$JOB" | jq -r 'if .phone then "- Phone: " + .phone else "" end')
$(echo "$JOB" | jq -r 'if .website then "- Current website: " + .website else "" end')
$(echo "$JOB" | jq -r 'if .hours then "- Hours: " + (.hours | to_entries | map(.key + ": " + .value) | join(", ")) else "" end')

${EXTRA_CONTEXT}

${GMAPS_CONTEXT}

${WEBSITE_CONTEXT}

${IMAGE_CONTEXT}

Return ONLY valid JSON with these keys: business_name, headline, headline_alternates (array of 2), phone, email, address, google_maps_url, primary_color, hero_image (path to best hero image from AVAILABLE IMAGES or empty string), rating (number from Google Maps data or null), review_count (number or null), reservation_links (array of {url, source} from Google Maps or []), about (title, body), services (3-6 items with title, description, icon emoji), gallery (array of items with image path from AVAILABLE IMAGES, alt text, category), faq (5-8 items), testimonials (3-5 items — prefer real Google reviews if available), hours (monday-sunday), cta (primary_text, primary_url, secondary_text, secondary_url), seo (title max 60 chars, description max 160 chars, keywords), nav_items (array of 4-6 strings), features (exactly 3 with title, subtitle, icon emoji), amenities (3-5 with label, icon emoji). Do NOT include a top-level \"design\" key — typography and layout tokens are generated in the next pipeline step.

When image data is available, populate gallery[].image with actual image paths like 'images/filename.jpg' and set hero_image to the best candidate. Use real Google Maps reviews as testimonials when available.

${EXTRA_SECTIONS}"
fi

CONTENT_RESPONSE=$(curl -s -X POST "https://api.anthropic.com/v1/messages" \
  -H "x-api-key: ${ANTHROPIC_API_KEY}" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d "$(jq -n \
    --arg prompt "$CONTENT_PROMPT" \
    '{
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: "You are a professional web copywriter for local businesses. Return ONLY valid JSON. No markdown fences, no explanation.",
      messages: [{ role: "user", content: $prompt }]
    }')")

CONTENT_TEXT=$(echo "$CONTENT_RESPONSE" | jq -r '.content[0].text // empty')
if [[ -z "$CONTENT_TEXT" ]]; then
  error "Claude API returned no content"
  echo "$CONTENT_RESPONSE" | jq . 2>/dev/null || echo "$CONTENT_RESPONSE"
  exit 1
fi

CLEANED=$(echo "$CONTENT_TEXT" | sed 's/^```[a-z]*//;s/```$//')
echo "$CLEANED" | jq . > "${WORK_DIR}/content.json" 2>/dev/null || {
  error "Failed to parse content JSON — saving raw"
  echo "$CLEANED" > "${WORK_DIR}/content-raw.txt"
  exit 1
}
ok "Content generated → ${WORK_DIR}/content.json"

# ── Step 5: Design system + design spec (markdown) ───────────
log "Step 5/${TOTAL_STEPS}: Design system & design specification..."

if echo "$JOB" | jq -e '.design != null and (.design | type == "object")' >/dev/null 2>&1; then
  jq --argjson d "$(echo "$JOB" | jq '.design')" '. * {design: $d}' "${WORK_DIR}/content.json" > "${WORK_DIR}/content.tmp" && mv "${WORK_DIR}/content.tmp" "${WORK_DIR}/content.json"
  ok "Merged design object from job config into content.json"
fi

rm -f "${WORK_DIR}/image-notes.txt"
if [[ "$HAS_IMAGE_MANIFEST" == true && -f "${WORK_DIR}/image-manifest.json" ]]; then
  WORK_DIR="$WORK_DIR" python3 << 'PYEOF' > "${WORK_DIR}/image-notes.txt"
import json, os

with open(os.path.join(os.environ.get("WORK_DIR", "/tmp"), "image-manifest.json")) as f:
    manifest = json.load(f)

good = [m for m in manifest if m.get("quality", 0) >= 5]
lines = ["## Image assignments (real photos — use these instead of placeholders)"]

hero = [m for m in good if "hero" in m.get("placement", [])]
if hero:
    lines.append(f"- HERO BACKGROUND: images/{hero[0]['filename']} — {hero[0].get('subject','')}")

gallery = [m for m in good if "gallery" in m.get("placement", [])]
if gallery:
    imgs = ", ".join(f"images/{m['filename']}" for m in gallery[:8])
    lines.append(f"- GALLERY: {imgs}")

about = [m for m in good if "about" in m.get("placement", [])]
if about:
    lines.append(f"- ABOUT SECTION BACKGROUND: images/{about[0]['filename']}")

food = [m for m in good if m.get("category") in ("food", "drink")]
if food:
    imgs = ", ".join(f"images/{m['filename']}" for m in food[:6])
    lines.append(f"- MENU/FOOD IMAGES: {imgs}")

lines.append("")
lines.append("Use actual <img> tags with src paths referencing these images. NO gradient-only placeholders when photos exist.")
print("\n".join(lines))
PYEOF
fi

DESIGN_SPEC_OVERRIDE=$(echo "$JOB" | jq -r '.design_spec // empty')
if [[ -n "$DESIGN_SPEC_OVERRIDE" ]]; then
  echo "$DESIGN_SPEC_OVERRIDE" > "${WORK_DIR}/design-spec.md"
  ok "Using design_spec from job (manual override) → ${WORK_DIR}/design-spec.md"
else
  if ! jq -e '.design.heading_font' "${WORK_DIR}/content.json" >/dev/null 2>&1; then
    log "Calling Claude API for design system..."
    PROMPTS_JSON=$(python3 "${SCRIPT_DIR}/build-design-system-prompt.py" "$WORK_DIR" "$JOB_FILE")
    echo "$PROMPTS_JSON" | jq -r '.system' > "${WORK_DIR}/ds-system.txt"
    echo "$PROMPTS_JSON" | jq -r '.user' > "${WORK_DIR}/ds-user.txt"
    jq -n \
      --rawfile system "${WORK_DIR}/ds-system.txt" \
      --rawfile user "${WORK_DIR}/ds-user.txt" \
      '{
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: ($system | rtrimstr("\n")),
        messages: [{ role: "user", content: ($user | rtrimstr("\n")) }]
      }' > "${WORK_DIR}/design-request.json"
    if ! curl -s -S -f -X POST "https://api.anthropic.com/v1/messages" \
      -H "x-api-key: ${ANTHROPIC_API_KEY}" \
      -H "anthropic-version: 2023-06-01" \
      -H "Content-Type: application/json" \
      -d @"${WORK_DIR}/design-request.json" -o "${WORK_DIR}/design-api-response.json"; then
      warn "Design system API request failed — using fallback tokens"
      echo '{"content":[{"text":""}]}' > "${WORK_DIR}/design-api-response.json"
    fi
    if ! python3 "${SCRIPT_DIR}/apply-design-system.py" "$WORK_DIR" "$PRIMARY_COLOR"; then
      error "apply-design-system.py failed"
      exit 1
    fi
    ok "Design system merged → ${WORK_DIR}/design-system.json"
  else
    log "Design system already in content.json — skipping Claude design call"
    jq '.design' "${WORK_DIR}/content.json" > "${WORK_DIR}/design-system.json"
  fi

  python3 "${SCRIPT_DIR}/render-design-spec.py" "$WORK_DIR" > "${WORK_DIR}/design-spec.md"
  ok "Design spec → ${WORK_DIR}/design-spec.md"
fi

# ── Step 6: Clone template + generate site via Claude API ────
log "Step 6/${TOTAL_STEPS}: Generating site code via Claude API..."

rm -rf "$SITE_DIR"
cp -r "$TEMPLATE_DIR" "$SITE_DIR"
rm -rf "${SITE_DIR}/.git" 2>/dev/null || true

PAGES_SITE="https://${GITHUB_OWNER}.github.io"
PAGES_BASE="/${REPO_SLUG}"

CONTENT_WITH_DEPLOY=$(jq --arg site "$PAGES_SITE" --arg base "$PAGES_BASE" \
  '. + { deploy: { site: $site, base: $base } }' "${WORK_DIR}/content.json")
echo "$CONTENT_WITH_DEPLOY" > "${SITE_DIR}/content/site.json"

cp "${WORK_DIR}/design-spec.md" "${SITE_DIR}/design-spec.md"

# Copy real images into site's public/images/ directory
IMG_COUNT=$(find "$ALL_IMAGES_DIR" -maxdepth 1 -type f \( -name '*.jpg' -o -name '*.jpeg' -o -name '*.png' -o -name '*.webp' -o -name '*.gif' \) 2>/dev/null | wc -l | tr -d ' ')
if [[ "$IMG_COUNT" -gt 0 ]]; then
  mkdir -p "${SITE_DIR}/public/images"
  find "$ALL_IMAGES_DIR" -maxdepth 1 -type f \( -name '*.jpg' -o -name '*.jpeg' -o -name '*.png' -o -name '*.webp' -o -name '*.gif' \) -exec cp {} "${SITE_DIR}/public/images/" \;
  ok "Copied ${IMG_COUNT} images to site/public/images/"
fi

# Include deploy in the prompt so the model sees the same site.json shape as the built site (base paths for images).
CONTENT_FOR_PROMPT=$(jq --arg site "$PAGES_SITE" --arg base "$PAGES_BASE" \
  '. + { deploy: { site: $site, base: $base } }' "${WORK_DIR}/content.json")
DESIGN_FOR_PROMPT=$(cat "${WORK_DIR}/design-spec.md")
EXTRA_COMPONENTS=$(echo "$JOB" | jq -r '.extra_components // ""')
SITE_GEN_RULES=$(cat "${PROJECT_DIR}/prompts/site-generation.md")

SITE_PROMPT="You are generating a distinctive Astro business website as a single JSON object: keys = file paths relative to project root, values = complete file contents.

${SITE_GEN_RULES}

## Design specification (markdown)
${DESIGN_FOR_PROMPT}

## Content data (site.json — includes design tokens under \"design\")
${CONTENT_FOR_PROMPT}

## Files to generate
Create these files (JSON object keys = paths, values = full source):
- src/pages/index.astro
- src/components/Navbar.astro
- src/components/Hero.astro
- src/components/Features.astro
- src/components/About.astro
- src/components/Services.astro
- src/components/Testimonials.astro
- src/components/FAQ.astro
- src/components/Contact.astro
- src/components/Footer.astro
${EXTRA_COMPONENTS}

## Import path (critical)
content/site.json is at the project root. Every file under src/ MUST use:
  import siteData from '../../content/site.json'
Never use ../content/site.json from src/.

## Images
When site.json has hero_image or gallery[].image, use real <img> or background-image. Prefix image paths with siteData.deploy.base (e.g. join base + /images/file.jpg). Prefer width, height, or aspect-ratio on images to reduce layout shift. Never use gradient-only heroes when real images exist.

Return ONLY a JSON object. No markdown fences, no explanation."

SITE_RESPONSE=$(curl -s -X POST "https://api.anthropic.com/v1/messages" \
  -H "x-api-key: ${ANTHROPIC_API_KEY}" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d "$(jq -n \
    --arg prompt "$SITE_PROMPT" \
    '{
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      system: "You are a senior frontend developer. Build distinctive, accessible Astro layouts — implement site.json.design (layout_signature, hero_treatment, nav_style, section_order, motion_level). Return ONLY a JSON object mapping file paths to complete file contents. No markdown fences, no explanation.",
      messages: [{ role: "user", content: $prompt }]
    }')")

SITE_TEXT=$(echo "$SITE_RESPONSE" | jq -r '.content[0].text // empty')
if [[ -z "$SITE_TEXT" ]]; then
  error "Claude API returned no site code"
  echo "$SITE_RESPONSE" | jq '.error // .' 2>/dev/null
  exit 1
fi

echo "$SITE_TEXT" > "${WORK_DIR}/site-files-raw.txt"

FILE_COUNT=$(WORK_DIR="$WORK_DIR" SITE_DIR="$SITE_DIR" python3 << 'PYEOF'
import json, sys, os, re

work_dir = os.environ["WORK_DIR"]
site_dir = os.environ["SITE_DIR"]

with open(f"{work_dir}/site-files-raw.txt") as f:
    raw = f.read().strip()

raw = re.sub(r'^```\w*\n?', '', raw)
raw = re.sub(r'\n?```$', '', raw)

try:
    files = json.loads(raw)
except json.JSONDecodeError:
    files = {}
    pattern = r'"(src/[^"]+\.astro)":\s*"'
    matches = list(re.finditer(pattern, raw))

    for i, m in enumerate(matches):
        fpath = m.group(1)
        content_start = m.end()
        if i + 1 < len(matches):
            next_start = matches[i + 1].start()
            chunk = raw[content_start:next_start]
            chunk = re.sub(r'",?\s*$', '', chunk)
        else:
            chunk = raw[content_start:]
            chunk = re.sub(r'"\s*\}\s*$', '', chunk)

        try:
            content = json.loads('"' + chunk + '"')
        except json.JSONDecodeError:
            content = chunk.replace('\\n', '\n').replace('\\t', '\t').replace('\\"', '"').replace("\\'", "'")

        files[fpath] = content

count = 0
for fpath, content in files.items():
    fpath = os.path.normpath(fpath)
    if fpath.startswith('..') or fpath.startswith('/'):
        continue
    full = os.path.join(site_dir, fpath)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w') as f:
        f.write(content)
    count += 1

print(count)
PYEOF
)

if [[ "$FILE_COUNT" == "0" ]]; then
  error "Failed to extract site files from Claude response"
  warn "Raw response saved to ${WORK_DIR}/site-files-raw.txt"
  exit 1
fi

COMP_COUNT=$(ls "${SITE_DIR}/src/components/"*.astro 2>/dev/null | wc -l | tr -d ' ')
ok "Site generated: ${FILE_COUNT} files, ${COMP_COUNT} components"

# ── Step 7: Validate ─────────────────────────────────────────
log "Step 7/${TOTAL_STEPS}: Validating..."

ERRORS=0
for f in src/pages/index.astro src/layouts/Layout.astro .pages.yml package.json content/site.json; do
  [[ ! -f "${SITE_DIR}/${f}" ]] && { error "Missing: ${f}"; ERRORS=$((ERRORS+1)); }
done
[[ $COMP_COUNT -lt 3 ]] && { error "Too few components: ${COMP_COUNT}"; ERRORS=$((ERRORS+1)); }

BAD_IMPORTS=$(grep -rl "from ['\"]../content/site.json['\"]" "${SITE_DIR}/src/" 2>/dev/null || true)
if [[ -n "$BAD_IMPORTS" ]]; then
  warn "Fixing incorrect import paths in $(echo "$BAD_IMPORTS" | wc -l | tr -d ' ') file(s)..."
  echo "$BAD_IMPORTS" | while read -r f; do
    sed -i '' "s|from '../content/site.json'|from '../../content/site.json'|g;s|from \"../content/site.json\"|from \"../../content/site.json\"|g" "$f"
  done
  ok "Import paths corrected"
fi

# Verify images referenced in site.json exist in public/images/
if [[ -d "${SITE_DIR}/public/images" ]]; then
  MISSING_IMGS=$(SITE_DIR="$SITE_DIR" python3 << 'PYEOF'
import json, os

site_dir = os.environ["SITE_DIR"]
with open(os.path.join(site_dir, "content", "site.json")) as f:
    data = json.load(f)

img_dir = os.path.join(site_dir, "public", "images")
existing = set(os.listdir(img_dir)) if os.path.isdir(img_dir) else set()

missing = []
hero = data.get("hero_image", "")
if hero:
    fname = os.path.basename(hero)
    if fname and fname not in existing:
        missing.append(fname)

for item in data.get("gallery", []):
    img = item.get("image", "")
    if img:
        fname = os.path.basename(img)
        if fname and fname not in existing:
            missing.append(fname)

print(len(missing))
PYEOF
)
  if [[ "$MISSING_IMGS" -gt 0 ]]; then
    warn "${MISSING_IMGS} image(s) referenced in site.json not found in public/images/"
  fi
fi

[[ $ERRORS -gt 0 ]] && { error "Validation failed"; exit 1; }
ok "Validation passed"

# ── Step 8: Push to GitHub ───────────────────────────────────
if [[ "$DRY_RUN" == true ]]; then
  warn "Dry run — skipping GitHub push"
  echo ""
  echo -e "${BOLD}━━━ Dry Run Complete ━━━${NC}"
  echo -e "  Output:     ${WORK_DIR}"
  echo -e "  Content:    ${WORK_DIR}/content.json"
  echo -e "  Site:       ${SITE_DIR}"
  echo -e "  Components: ${COMP_COUNT}"
  [[ "$HAS_GMAPS_DATA" == true ]] && echo -e "  GMaps data: ${WORK_DIR}/gmaps-enrichment.json"
  [[ "$HAS_WEBSITE_DATA" == true ]] && echo -e "  Website:    ${WORK_DIR}/website-analysis.json"
  [[ "$HAS_IMAGE_MANIFEST" == true ]] && echo -e "  Images:     ${WORK_DIR}/image-manifest.json"
  echo ""
  exit 0
fi

log "Step 8/${TOTAL_STEPS}: Pushing to GitHub..."

CREATE_RESULT=$(curl -s -X POST "https://api.github.com/user/repos" \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -d "$(jq -n --arg name "$REPO_SLUG" --arg desc "Website for ${BUSINESS_NAME}" \
    '{ name: $name, description: $desc, auto_init: false, private: false, has_issues: false, has_wiki: false }')")

REPO_EXISTS=$(echo "$CREATE_RESULT" | jq -r '.full_name // empty')
REPO_ERROR=$(echo "$CREATE_RESULT" | jq -r '.errors[0].message // empty')

if [[ -n "$REPO_EXISTS" ]]; then
  ok "Repo created: ${REPO_EXISTS}"
elif [[ "$REPO_ERROR" == *"already exists"* ]]; then
  warn "Repo already exists: ${GITHUB_OWNER}/${REPO_SLUG}"
else
  ok "Repo ready: ${GITHUB_OWNER}/${REPO_SLUG}"
fi

cd "$SITE_DIR"
rm -f design-spec.md
log "Installing dependencies (generating package-lock.json)..."
npm install --silent 2>/dev/null
ok "package-lock.json generated"

git init -q
git checkout -b main 2>/dev/null || true
git add -A
git commit -q -m "Initial site: ${BUSINESS_NAME}" --author="Website Factory <bot@panditai.org>"
git remote add origin "https://${GITHUB_TOKEN}@github.com/${GITHUB_OWNER}/${REPO_SLUG}.git" 2>/dev/null || \
  git remote set-url origin "https://${GITHUB_TOKEN}@github.com/${GITHUB_OWNER}/${REPO_SLUG}.git"
git push -u origin main --force -q
ok "Code pushed to ${GITHUB_OWNER}/${REPO_SLUG}"

sleep 2
PAGES_RESULT=$(curl -s -X POST "https://api.github.com/repos/${GITHUB_OWNER}/${REPO_SLUG}/pages" \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -d '{"build_type":"workflow"}' 2>/dev/null || true)

ok "GitHub Pages enabled (deploying via Actions)"

PAGES_URL="https://${GITHUB_OWNER}.github.io/${REPO_SLUG}/"
CMS_URL="https://cms.panditai.org/${GITHUB_OWNER}/${REPO_SLUG}"
REPO_URL="https://github.com/${GITHUB_OWNER}/${REPO_SLUG}"

PROJECTS_FILE="${REPO_ROOT}/data/n8n/website-factory/projects.json"
mkdir -p "$(dirname "$PROJECTS_FILE")"
PROJECTS="{}"
[[ -f "$PROJECTS_FILE" ]] && PROJECTS=$(cat "$PROJECTS_FILE")
PROJECTS=$(echo "$PROJECTS" | jq --arg id "$PROJECT_ID" --arg name "$BUSINESS_NAME" \
  --arg slug "$REPO_SLUG" --arg cat "$CATEGORY" --arg email "$CLIENT_EMAIL" \
  --arg url "$PAGES_URL" --arg cms "$CMS_URL" --arg repo "$REPO_URL" \
  '.[$id] = { project_id: $id, business_name: $name, repo_slug: $slug, category: $cat,
    client_email: $email, pages_url: $url, cms_url: $cms, repo_url: $repo,
    status: "deploying", created_at: (now | todate) }')
echo "$PROJECTS" | jq . > "$PROJECTS_FILE"

echo ""
echo -e "${BOLD}━━━ Website Factory Complete ━━━${NC}"
echo -e "  Site:       ${GREEN}${PAGES_URL}${NC}  (deploying, ~2 min)"
echo -e "  CMS:        ${GREEN}${CMS_URL}${NC}"
echo -e "  Repository: ${GREEN}${REPO_URL}${NC}"
echo -e "  Components: ${COMP_COUNT}"
[[ "$HAS_GMAPS_DATA" == true ]] && echo -e "  GMaps:      ${GREEN}enriched with real data${NC}"
[[ "$HAS_IMAGE_MANIFEST" == true ]] && echo -e "  Images:     ${GREEN}$(find "${SITE_DIR}/public/images/" -maxdepth 1 -type f \( -name '*.jpg' -o -name '*.jpeg' -o -name '*.png' -o -name '*.webp' -o -name '*.gif' \) 2>/dev/null | wc -l | tr -d ' ') real photos${NC}"
echo ""
