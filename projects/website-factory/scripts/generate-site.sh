#!/usr/bin/env bash
# ============================================================
# Website Factory — Site Generation Script
# ============================================================
# Called by the n8n Execute Command node to:
#   1. Clone the base template
#   2. Inject content, photos, and CMS config
#   3. Run Claude Code CLI to generate the site from the mockup
#   4. Validate the output
#
# Usage:
#   ./generate-site.sh <project_id>
#
# Required environment variables:
#   ANTHROPIC_API_KEY — Anthropic API key (used by Claude Code CLI)
#   GITHUB_OWNER      — GitHub username/org for the repo
#   TEMPLATE_REPO     — Base template repo (e.g., tech-sumit/website-factory-base)
#   GITHUB_TOKEN      — GitHub token (for cloning private template if needed)
#
# Required files in /tmp/website-factory/<project_id>/:
#   mockup.png        — AI-generated landing page design
#   content.json      — AI-generated content (from Claude)
#   config.yml        — Decap CMS config (repo-specific)
#   photos/           — (optional) Business photos from Google Places
#
# ============================================================

set -euo pipefail

# ── Constants ────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CLAUDE_MODEL="${CLAUDE_MODEL:-claude-opus-4-6}"
MAX_RETRIES=2
TIMEOUT=600  # 10 minutes

# ── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()   { echo -e "${BLUE}[$(date -u +%H:%M:%S)]${NC} $*"; }
ok()    { echo -e "${GREEN}[$(date -u +%H:%M:%S)] ✓${NC} $*"; }
warn()  { echo -e "${YELLOW}[$(date -u +%H:%M:%S)] ⚠${NC} $*"; }
error() { echo -e "${RED}[$(date -u +%H:%M:%S)] ✗${NC} $*" >&2; }

# ── Args ─────────────────────────────────────────────────────
PROJECT_ID="${1:?Usage: $0 <project_id>}"
WORK_DIR="/tmp/website-factory/${PROJECT_ID}"
SITE_DIR="${WORK_DIR}/site"

# ── Validate prerequisites ───────────────────────────────────
log "Starting site generation for project: ${PROJECT_ID}"

if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
  error "ANTHROPIC_API_KEY is not set"
  exit 1
fi

if [[ -z "${TEMPLATE_REPO:-}" ]]; then
  TEMPLATE_REPO="tech-sumit/website-factory-base"
  warn "TEMPLATE_REPO not set, using default: ${TEMPLATE_REPO}"
fi

if [[ ! -f "${WORK_DIR}/design-spec.md" ]] && [[ ! -f "${WORK_DIR}/mockup.png" ]]; then
  error "Neither design-spec.md nor mockup.png found in ${WORK_DIR}"
  exit 1
fi

if [[ ! -f "${WORK_DIR}/content.json" ]]; then
  error "Content JSON not found: ${WORK_DIR}/content.json"
  exit 1
fi

# ── Step 1: Clone base template ──────────────────────────────
log "Cloning base template from ${TEMPLATE_REPO}..."

if [[ -d "${SITE_DIR}" ]]; then
  warn "Site directory already exists, removing..."
  rm -rf "${SITE_DIR}"
fi

if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  git clone --depth 1 "https://${GITHUB_TOKEN}@github.com/${TEMPLATE_REPO}.git" "${SITE_DIR}" 2>/dev/null
else
  git clone --depth 1 "https://github.com/${TEMPLATE_REPO}.git" "${SITE_DIR}" 2>/dev/null
fi

ok "Base template cloned"

# ── Step 2: Inject content ───────────────────────────────────
log "Injecting content and assets..."

# Copy design spec or mockup for Claude Code to reference
if [[ -f "${WORK_DIR}/design-spec.md" ]]; then
  cp "${WORK_DIR}/design-spec.md" "${SITE_DIR}/design-spec.md"
  ok "Design spec copied"
fi
if [[ -f "${WORK_DIR}/mockup.png" ]]; then
  cp "${WORK_DIR}/mockup.png" "${SITE_DIR}/mockup.png"
  ok "Mockup image copied"
fi

# Inject content JSON
cp "${WORK_DIR}/content.json" "${SITE_DIR}/content/site.json"

# Inject CMS config if provided
if [[ -f "${WORK_DIR}/config.yml" ]]; then
  cp "${WORK_DIR}/config.yml" "${SITE_DIR}/public/admin/config.yml"
  ok "Decap CMS config injected"
fi

# Copy business photos if any
if [[ -d "${WORK_DIR}/photos" ]] && [[ "$(ls -A "${WORK_DIR}/photos" 2>/dev/null)" ]]; then
  cp -r "${WORK_DIR}/photos/"* "${SITE_DIR}/public/images/"
  PHOTO_COUNT=$(ls -1 "${WORK_DIR}/photos" | wc -l | tr -d ' ')
  ok "Copied ${PHOTO_COUNT} business photos"
else
  warn "No business photos found, skipping"
fi

ok "Content injected"

# ── Step 3: Build Claude Code prompt ─────────────────────────
log "Preparing Claude Code prompt..."

# Write prompt to a temp file for claude -p
PROMPT_FILE="${WORK_DIR}/claude-prompt.md"
cat > "${PROMPT_FILE}" << 'PROMPT'
You are building a production-ready website for a local business. Your workspace contains:

1. ./design-spec.md — A detailed design specification. Follow it closely for layout, colors, and structure.
2. ./content/site.json — All business content. Read this and use for ALL text. NEVER hardcode text.
3. ./public/images/ — Business photos. Reference these in components.
4. ./src/layouts/Layout.astro — Base HTML layout. Extend it.
5. ./src/styles/global.css — Base CSS with Tailwind. Add to it, do not remove existing.

START by reading ./design-spec.md and ./content/site.json to understand the business and design requirements.

BUILD THESE:

1. src/pages/index.astro — Full landing page composing all section components
2. src/components/Navbar.astro — Sticky nav with mobile hamburger menu
3. src/components/Hero.astro — Full-bleed hero with gradient overlay
4. src/components/Features.astro — 3-column feature cards
5. src/components/About.astro — About section
6. src/components/Services.astro — Services grid
7. src/components/Testimonials.astro — Customer reviews with ratings
8. src/components/FAQ.astro — Accordion FAQ (pure CSS/JS)
9. src/components/Contact.astro — Contact info, map embed, hours
10. src/components/Footer.astro — Footer with links and copyright

RULES:
- Use Tailwind CSS for ALL styling. Follow the design spec colors and layout.
- Use pre-built classes: .btn-primary, .btn-secondary, .section-padding, .container-wide
- Use animations: .animate-fade-in, .animate-slide-up
- Mobile-first responsive. Semantic HTML5. Accessible (aria-labels, alt text).
- Read ALL content from content/site.json — zero hardcoded business text.
- Lazy load below-fold images. Minimal JS. No frameworks.

DO NOT: modify .github/, public/admin/, package.json. No test files. No new dependencies.

Match the quality of premium Wix/Squarespace templates.
Refer to ./design-spec.md as the design source of truth. Build the full site NOW.
PROMPT

# ── Step 4: Run Claude Code CLI ──────────────────────────────
log "Running Claude Code agent (model: ${CLAUDE_MODEL}, timeout: ${TIMEOUT}s)..."

ATTEMPT=0
CLAUDE_EXIT=1

while [[ ${ATTEMPT} -lt ${MAX_RETRIES} && ${CLAUDE_EXIT} -ne 0 ]]; do
  ATTEMPT=$((ATTEMPT + 1))
  log "Attempt ${ATTEMPT}/${MAX_RETRIES}..."

  START_TIME=$(date +%s)

  set +e
  cd "${SITE_DIR}"
  timeout "${TIMEOUT}" claude -p \
    --model "${CLAUDE_MODEL}" \
    --allowedTools "Read,Edit,Write,Bash,Glob,Grep" \
    --output-format text \
    "$(cat "${PROMPT_FILE}")" \
    2>"${WORK_DIR}/claude-stderr-${ATTEMPT}.log" \
    >"${WORK_DIR}/claude-stdout-${ATTEMPT}.log"

  CLAUDE_EXIT=$?
  set -e

  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))

  if [[ ${CLAUDE_EXIT} -eq 0 ]]; then
    ok "Claude Code completed in ${DURATION}s"
  elif [[ ${CLAUDE_EXIT} -eq 124 ]]; then
    error "Claude Code timed out after ${TIMEOUT}s (attempt ${ATTEMPT})"
  else
    error "Claude Code failed with exit code ${CLAUDE_EXIT} (attempt ${ATTEMPT}, ${DURATION}s)"
    if [[ -f "${WORK_DIR}/claude-stderr-${ATTEMPT}.log" ]]; then
      tail -20 "${WORK_DIR}/claude-stderr-${ATTEMPT}.log"
    fi
  fi
done

if [[ ${CLAUDE_EXIT} -ne 0 ]]; then
  error "All ${MAX_RETRIES} attempts failed"
  exit 1
fi

# ── Step 5: Cleanup temporary files ──────────────────────────
log "Cleaning up..."
rm -f "${SITE_DIR}/mockup.png" "${SITE_DIR}/design-spec.md"

# ── Step 6: Validate output ──────────────────────────────────
log "Validating generated site..."

ERRORS=0

# Check required files
REQUIRED_FILES=(
  "src/pages/index.astro"
  "src/layouts/Layout.astro"
  "public/admin/index.html"
  "public/admin/config.yml"
  ".github/workflows/deploy.yml"
  "package.json"
  "content/site.json"
)

for f in "${REQUIRED_FILES[@]}"; do
  if [[ ! -f "${SITE_DIR}/${f}" ]]; then
    error "Missing required file: ${f}"
    ERRORS=$((ERRORS + 1))
  fi
done

# Check index.astro has substantial content
INDEX_SIZE=$(wc -c < "${SITE_DIR}/src/pages/index.astro" | tr -d ' ')
if [[ ${INDEX_SIZE} -lt 100 ]]; then
  error "index.astro is too small (${INDEX_SIZE} bytes), likely placeholder"
  ERRORS=$((ERRORS + 1))
fi

# Check components were generated
COMPONENT_COUNT=$(find "${SITE_DIR}/src/components" -name "*.astro" 2>/dev/null | wc -l | tr -d ' ')
if [[ ${COMPONENT_COUNT} -lt 3 ]]; then
  error "Too few components generated (${COMPONENT_COUNT}), expected 5+"
  ERRORS=$((ERRORS + 1))
else
  ok "Found ${COMPONENT_COUNT} components"
fi

# Check CMS config wasn't corrupted
if ! grep -q "backend:" "${SITE_DIR}/public/admin/config.yml" 2>/dev/null; then
  error "Decap CMS config.yml was corrupted"
  ERRORS=$((ERRORS + 1))
fi

# Check package.json wasn't modified (compare with template)
# This is a soft check — warn but don't fail
if [[ -f "${WORK_DIR}/package.json.bak" ]]; then
  if ! diff -q "${SITE_DIR}/package.json" "${WORK_DIR}/package.json.bak" >/dev/null 2>&1; then
    warn "package.json was modified by Claude Code"
  fi
fi

# Check no unwanted directories were created
for dir in node_modules dist .next .astro test tests __tests__; do
  if [[ -d "${SITE_DIR}/${dir}" ]]; then
    warn "Unwanted directory created: ${dir} — removing"
    rm -rf "${SITE_DIR:?}/${dir}"
  fi
done

if [[ ${ERRORS} -gt 0 ]]; then
  error "Validation failed with ${ERRORS} error(s)"
  exit 1
fi

ok "Validation passed"

# ── Step 7: Output summary ───────────────────────────────────
echo ""
echo "============================================================"
echo "  Site Generation Complete"
echo "============================================================"
echo "  Project ID:    ${PROJECT_ID}"
echo "  Site Dir:      ${SITE_DIR}"
echo "  Components:    ${COMPONENT_COUNT}"
echo "  Index Size:    ${INDEX_SIZE} bytes"
echo "  Attempts:      ${ATTEMPT}"
echo "  Duration:      ${DURATION}s"
echo "============================================================"

# Output JSON for n8n to parse
cat <<EOF
{"status":"success","project_id":"${PROJECT_ID}","site_dir":"${SITE_DIR}","components":${COMPONENT_COUNT},"index_size":${INDEX_SIZE},"attempts":${ATTEMPT},"duration":${DURATION}}
EOF
