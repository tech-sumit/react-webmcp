#!/usr/bin/env bash
# ============================================================
# Website Factory — CLI Job Runner
# ============================================================
# Runs the full pipeline locally without n8n:
#   1. Read job config JSON
#   2. Generate content via Claude API
#   3. Generate site code via Claude API
#   4. Create GitHub repo + push
#   5. Enable GitHub Pages
#
# Usage:
#   ./scripts/run-job.sh jobs/cafe-peter.json
#   ./scripts/run-job.sh jobs/cafe-peter.json --dry-run   # skip GitHub push
#
# Required env: ANTHROPIC_API_KEY (or OPENCLAW_API_KEY), GITHUB_TOKEN, GITHUB_OWNER
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

ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-${OPENCLAW_API_KEY:-}}"
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

WORK_DIR="/tmp/website-factory/${PROJECT_ID}"
SITE_DIR="${WORK_DIR}/site"

echo ""
echo -e "${BOLD}━━━ Website Factory Job ━━━${NC}"
echo -e "  Business:    ${GREEN}${BUSINESS_NAME}${NC}"
echo -e "  Repo:        ${GITHUB_OWNER}/${REPO_SLUG}"
echo -e "  Category:    ${CATEGORY}"
echo -e "  Style:       ${STYLE_PRESET} / ${PRIMARY_COLOR}"
echo -e "  Project ID:  ${PROJECT_ID}"
echo -e "  Dry run:     ${DRY_RUN}"
echo ""

mkdir -p "$WORK_DIR"

# ── Step 1: Generate content via Claude API ──────────────────
log "Step 1/5: Generating content via Claude API..."

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

Return ONLY valid JSON with these keys: business_name, headline, headline_alternates (array of 2), phone, email, address, google_maps_url, primary_color, about (title, body), services (3-6 items with title, description, icon emoji), faq (5-8 items), testimonials (3-5 items), hours (monday-sunday), cta (primary_text, primary_url, secondary_text, secondary_url), seo (title max 60 chars, description max 160 chars, keywords), nav_items (array of 4-6 strings), features (exactly 3 with title, subtitle, icon emoji), amenities (3-5 with label, icon emoji).

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

# ── Step 2: Build design spec ────────────────────────────────
log "Step 2/5: Building design specification..."

DESIGN_SPEC=$(echo "$JOB" | jq -r '.design_spec // empty')
if [[ -z "$DESIGN_SPEC" ]]; then
  CONTENT_JSON=$(cat "${WORK_DIR}/content.json")
  BIZ_HEADLINE=$(echo "$CONTENT_JSON" | jq -r '.headline // "Welcome"')
  NAV_ITEMS=$(echo "$CONTENT_JSON" | jq -r '.nav_items // ["Home","About","Menu","Contact"] | join(", ")')
  FEATURES_DESC=$(echo "$CONTENT_JSON" | jq -r '(.features // [])[:3] | to_entries | map("Card \(.key+1): \(.value.icon // "⭐") \(.value.title // "Feature")") | join("; ")')

  DESIGN_SPEC="# Design Specification for ${BUSINESS_NAME}

## Visual Design Brief
Design a professional, polished website landing page for \"${BUSINESS_NAME}\", a ${CATEGORY} in $(echo "$JOB" | jq -r '.address // "Pune, India"').

LAYOUT (top to bottom):
1. NAVIGATION BAR: Logo/name left, menu items: ${NAV_ITEMS}, CTA button right
2. HERO SECTION (60% viewport): Background with gradient overlay, heading \"${BUSINESS_NAME}\", tagline \"${BIZ_HEADLINE}\", two CTA buttons
3. FEATURES (3 cards): ${FEATURES_DESC}
4. Additional sections as appropriate for a ${CATEGORY}

## Style
- Preset: ${STYLE_PRESET}
- Primary Color: ${PRIMARY_COLOR}
- Category: ${CATEGORY}
- Quality bar: premium, modern, Wix/Squarespace level
"
fi

echo "$DESIGN_SPEC" > "${WORK_DIR}/design-spec.md"
ok "Design spec → ${WORK_DIR}/design-spec.md"

# ── Step 3: Clone template + generate site via Claude API ────
log "Step 3/5: Generating site code via Claude API..."

rm -rf "$SITE_DIR"
cp -r "$TEMPLATE_DIR" "$SITE_DIR"
rm -rf "${SITE_DIR}/.git" 2>/dev/null || true

PAGES_SITE="https://${GITHUB_OWNER}.github.io"
PAGES_BASE="/${REPO_SLUG}"

CONTENT_WITH_DEPLOY=$(jq --arg site "$PAGES_SITE" --arg base "$PAGES_BASE" \
  '. + { deploy: { site: $site, base: $base } }' "${WORK_DIR}/content.json")
echo "$CONTENT_WITH_DEPLOY" > "${SITE_DIR}/content/site.json"

cp "${WORK_DIR}/design-spec.md" "${SITE_DIR}/design-spec.md"

# Generate CMS config
cat > "${SITE_DIR}/public/admin/config.yml" << CMSEOF
backend:
  name: github
  repo: "${GITHUB_OWNER}/${REPO_SLUG}"
  branch: main

site_url: "https://${GITHUB_OWNER}.github.io/${REPO_SLUG}"
display_url: "https://${GITHUB_OWNER}.github.io/${REPO_SLUG}"

media_folder: "public/images"
public_folder: "/images"

collections:
  - name: "settings"
    label: "Site Settings"
    files:
      - name: "site"
        label: "Site Configuration"
        file: "content/site.json"
        fields:
          - { label: "Business Name", name: "business_name", widget: "string" }
          - { label: "Tagline", name: "headline", widget: "string" }
          - { label: "Phone", name: "phone", widget: "string", required: false }
          - { label: "Email", name: "email", widget: "string", required: false }
          - { label: "Address", name: "address", widget: "text", required: false }
          - { label: "Primary Color", name: "primary_color", widget: "color" }
          - label: "About"
            name: "about"
            widget: "object"
            fields:
              - { label: "Title", name: "title", widget: "string" }
              - { label: "Body", name: "body", widget: "markdown" }
          - label: "Services"
            name: "services"
            widget: "list"
            fields:
              - { label: "Title", name: "title", widget: "string" }
              - { label: "Description", name: "description", widget: "text" }
              - { label: "Icon", name: "icon", widget: "string", required: false }
          - label: "FAQ"
            name: "faq"
            widget: "list"
            fields:
              - { label: "Question", name: "question", widget: "string" }
              - { label: "Answer", name: "answer", widget: "markdown" }
          - label: "Testimonials"
            name: "testimonials"
            widget: "list"
            fields:
              - { label: "Author", name: "author", widget: "string" }
              - { label: "Quote", name: "quote", widget: "text" }
              - { label: "Rating", name: "rating", widget: "number", value_type: "int", min: 1, max: 5 }
          - label: "Hours"
            name: "hours"
            widget: "object"
            fields:
              - { label: "Monday", name: "monday", widget: "string", required: false }
              - { label: "Tuesday", name: "tuesday", widget: "string", required: false }
              - { label: "Wednesday", name: "wednesday", widget: "string", required: false }
              - { label: "Thursday", name: "thursday", widget: "string", required: false }
              - { label: "Friday", name: "friday", widget: "string", required: false }
              - { label: "Saturday", name: "saturday", widget: "string", required: false }
              - { label: "Sunday", name: "sunday", widget: "string", required: false }
          - label: "SEO"
            name: "seo"
            widget: "object"
            fields:
              - { label: "Title", name: "title", widget: "string" }
              - { label: "Description", name: "description", widget: "text" }
              - { label: "Keywords", name: "keywords", widget: "string" }
CMSEOF

CONTENT_FOR_PROMPT=$(cat "${WORK_DIR}/content.json")
DESIGN_FOR_PROMPT=$(cat "${WORK_DIR}/design-spec.md")
EXTRA_COMPONENTS=$(echo "$JOB" | jq -r '.extra_components // ""')

SITE_PROMPT="Generate an Astro website based on the following design specification and content.

## Design Specification
${DESIGN_FOR_PROMPT}

## Content Data (site.json)
${CONTENT_FOR_PROMPT}

## Files to Generate
Create these files as a JSON object (keys = file paths relative to project root, values = complete file contents):
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

## Rules
- Use Tailwind CSS for all styling (already configured)
- CRITICAL IMPORT PATH: content/site.json lives at the PROJECT ROOT (not under src/).
  All files under src/ (components, pages, layouts) MUST use: import siteData from '../../content/site.json'
  The path is ALWAYS '../../content/site.json' — NEVER '../content/site.json'.
- Use pre-built classes: .btn-primary, .btn-secondary, .section-padding, .container-wide
- Use animations: .animate-fade-in, .animate-slide-up
- Mobile-first responsive, semantic HTML5, accessible (aria-labels, alt text)
- Read ALL content from site.json — zero hardcoded business text
- Lazy load below-fold images. No frameworks beyond what's in the template.
- DO NOT modify: .github/, package.json, astro.config.mjs, tailwind.config.mjs, src/layouts/Layout.astro
- Match quality of premium Wix/Squarespace templates

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
      system: "You are a senior frontend developer. Generate Astro components. Return ONLY a JSON object where keys are file paths and values are complete file contents. No explanation, no markdown.",
      messages: [{ role: "user", content: $prompt }]
    }')")

SITE_TEXT=$(echo "$SITE_RESPONSE" | jq -r '.content[0].text // empty')
if [[ -z "$SITE_TEXT" ]]; then
  error "Claude API returned no site code"
  echo "$SITE_RESPONSE" | jq '.error // .' 2>/dev/null
  exit 1
fi

echo "$SITE_TEXT" > "${WORK_DIR}/site-files-raw.txt"

# Extract files from Claude response (handles malformed JSON from code in string values)
FILE_COUNT=$(WORK_DIR="$WORK_DIR" SITE_DIR="$SITE_DIR" python3 << 'PYEOF'
import json, sys, os, re

work_dir = os.environ["WORK_DIR"]
site_dir = os.environ["SITE_DIR"]

with open(f"{work_dir}/site-files-raw.txt") as f:
    raw = f.read().strip()

raw = re.sub(r'^```\w*\n?', '', raw)
raw = re.sub(r'\n?```$', '', raw)

# Try direct JSON parse first
try:
    files = json.loads(raw)
except json.JSONDecodeError:
    # Fallback: extract file blocks using regex pattern matching
    # Claude outputs: "filepath": "content...", so we split on the key pattern
    files = {}
    # Match "src/..." or similar path keys
    pattern = r'"(src/[^"]+\.astro)":\s*"'
    matches = list(re.finditer(pattern, raw))

    for i, m in enumerate(matches):
        fpath = m.group(1)
        content_start = m.end()
        # Find the end: next key or end of object
        if i + 1 < len(matches):
            # Search backwards from next match for the separator: ",\n  "
            next_start = matches[i + 1].start()
            chunk = raw[content_start:next_start]
            # Remove trailing ",\n  or similar
            chunk = re.sub(r'",?\s*$', '', chunk)
        else:
            chunk = raw[content_start:]
            chunk = re.sub(r'"\s*\}\s*$', '', chunk)

        # Unescape JSON string escapes
        try:
            content = json.loads('"' + chunk + '"')
        except json.JSONDecodeError:
            # Manual unescape for common patterns
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

# ── Step 4: Validate ─────────────────────────────────────────
log "Step 4/5: Validating..."

ERRORS=0
for f in src/pages/index.astro src/layouts/Layout.astro public/admin/config.yml package.json content/site.json; do
  [[ ! -f "${SITE_DIR}/${f}" ]] && { error "Missing: ${f}"; ERRORS=$((ERRORS+1)); }
done
[[ $COMP_COUNT -lt 3 ]] && { error "Too few components: ${COMP_COUNT}"; ERRORS=$((ERRORS+1)); }

# Fix bad import paths: Claude sometimes generates '../content/site.json'
# instead of '../../content/site.json'. Auto-correct in all src/ files.
BAD_IMPORTS=$(grep -rl "from ['\"]../content/site.json['\"]" "${SITE_DIR}/src/" 2>/dev/null || true)
if [[ -n "$BAD_IMPORTS" ]]; then
  warn "Fixing incorrect import paths in $(echo "$BAD_IMPORTS" | wc -l | tr -d ' ') file(s)..."
  echo "$BAD_IMPORTS" | while read -r f; do
    sed -i '' "s|from '../content/site.json'|from '../../content/site.json'|g;s|from \"../content/site.json\"|from \"../../content/site.json\"|g" "$f"
  done
  ok "Import paths corrected"
fi

[[ $ERRORS -gt 0 ]] && { error "Validation failed"; exit 1; }
ok "Validation passed"

# ── Step 5: Push to GitHub ───────────────────────────────────
if [[ "$DRY_RUN" == true ]]; then
  warn "Dry run — skipping GitHub push"
  echo ""
  echo -e "${BOLD}━━━ Dry Run Complete ━━━${NC}"
  echo -e "  Output:     ${WORK_DIR}"
  echo -e "  Content:    ${WORK_DIR}/content.json"
  echo -e "  Site:       ${SITE_DIR}"
  echo -e "  Components: ${COMP_COUNT}"
  echo ""
  exit 0
fi

log "Step 5/5: Pushing to GitHub..."

# Create repo (ignore error if exists)
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

# Generate package-lock.json for CI (npm ci requires it)
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

# Enable GitHub Pages (source: GitHub Actions)
sleep 2
PAGES_RESULT=$(curl -s -X POST "https://api.github.com/repos/${GITHUB_OWNER}/${REPO_SLUG}/pages" \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -d '{"build_type":"workflow"}' 2>/dev/null || true)

ok "GitHub Pages enabled (deploying via Actions)"

PAGES_URL="https://${GITHUB_OWNER}.github.io/${REPO_SLUG}/"
CMS_URL="${PAGES_URL}admin/"
REPO_URL="https://github.com/${GITHUB_OWNER}/${REPO_SLUG}"

# Save to projects.json
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
echo -e "  CMS Admin:  ${GREEN}${CMS_URL}${NC}"
echo -e "  Repository: ${GREEN}${REPO_URL}${NC}"
echo -e "  Components: ${COMP_COUNT}"
echo ""
