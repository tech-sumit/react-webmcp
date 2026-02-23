#!/usr/bin/env bash
# ============================================================
# Website Factory — Dry Run (Content + Optional Site Gen)
# ============================================================
# Tests the content generation and optionally site generation
# without running the full n8n pipeline.
#
# Usage:
#   ./scripts/dry-run.sh                    # Content only
#   ./scripts/dry-run.sh --site            # Content + Claude API site gen
#
# Required: ANTHROPIC_API_KEY (or OPENCLAW_API_KEY) in env or .env
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(dirname "$(dirname "$PROJECT_DIR")")"
WORK_DIR="/tmp/website-factory-dry-run"
PROJECT_ID="dry-run-$(date +%Y%m%d%H%M%S)"

# Load .env if present
if [[ -f "${REPO_ROOT}/.env" ]]; then
  set -a
  source "${REPO_ROOT}/.env"
  set +a
fi

ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-${OPENCLAW_API_KEY:-}}"
if [[ -z "${ANTHROPIC_API_KEY}" ]]; then
  echo "ERROR: ANTHROPIC_API_KEY or OPENCLAW_API_KEY required"
  exit 1
fi

DO_SITE=false
[[ "${1:-}" == "--site" ]] && DO_SITE=true

# Sample enriched business data (matching workflow structure)
SAMPLE_DATA=$(cat <<'JSON'
{
  "project_id": "dryrun01",
  "business_name": "Bollywood Multiplex",
  "repo_slug": "bollywood-multiplex",
  "category": "multiplex",
  "description": "Premium cinema experience in Pune with latest Bollywood and Hollywood releases",
  "style_preset": "modern-dark",
  "primary_color": "#2563EB",
  "address": {
    "full": "Old Mundhwa Rd, Kharadi, Pune 411014",
    "city": "Pune",
    "state": "Maharashtra",
    "country": "India"
  },
  "phone": "+91 20 1234 5678",
  "hours": {
    "monday": "10:00 AM – 11:00 PM",
    "tuesday": "10:00 AM – 11:00 PM",
    "wednesday": "10:00 AM – 11:00 PM",
    "thursday": "10:00 AM – 11:00 PM",
    "friday": "10:00 AM – 12:00 AM",
    "saturday": "10:00 AM – 12:00 AM",
    "sunday": "10:00 AM – 11:00 PM"
  },
  "rating": 4.5,
  "review_count": 128,
  "top_reviews": [
    { "author": "Movie Buff", "text": "Best screens in Pune. Comfortable seating!", "rating": 5 },
    { "author": "Local Guide", "text": "Great variety of snacks and clean facilities.", "rating": 4 }
  ]
}
JSON
)

echo "=== Website Factory Dry Run ==="
echo "  Project ID: ${PROJECT_ID}"
echo "  Mode: ${DO_SITE:+Content + Site Generation}${DO_SITE:-Content only}"
echo ""

mkdir -p "${WORK_DIR}"
cd "${WORK_DIR}"

# Build Claude user prompt from sample data
HOURS_SUMMARY=$(echo "$SAMPLE_DATA" | jq -r '.hours | to_entries | map("\(.key): \(.value)") | join(", ")')
REVIEWS_TEXT=$(echo "$SAMPLE_DATA" | jq -r '(.top_reviews // [])[0:5][] | "- \"" + .text + "\" — " + .author + " (" + (.rating|tostring) + "★)"' 2>/dev/null || echo "  None")

USER_PROMPT="Generate complete website content for the following business.

BUSINESS DATA:
- Name: Bollywood Multiplex
- Category: multiplex
- Description: Premium cinema experience in Pune with latest Bollywood and Hollywood releases
- Address: Old Mundhwa Rd, Kharadi, Pune 411014
- City: Pune, Maharashtra
- Phone: +91 20 1234 5678
- Rating: 4.5 (128 reviews)
- Hours: ${HOURS_SUMMARY}
- Top Reviews:
${REVIEWS_TEXT}

STYLE PRESET: modern-dark
PRIMARY COLOR: #2563EB

Return ONLY valid JSON matching the schema: business_name, headline, headline_alternates, phone, email, address, google_maps_url, primary_color, about (title, body), services (3-6 items), faq (5-8 items), testimonials (3-5 items), hours (monday-sunday), cta (primary_text, primary_url, secondary_text, secondary_url), seo (title, description, keywords), nav_items, features (exactly 3), amenities (3-5)."

SYSTEM_PROMPT="You are a professional web copywriter for local businesses. Return ONLY valid JSON. No markdown, no explanation."

echo "1. Calling Claude API (content generation)..."
RESPONSE=$(curl -s -X POST "https://api.anthropic.com/v1/messages" \
  -H "x-api-key: ${ANTHROPIC_API_KEY}" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"claude-sonnet-4-20250514\",
    \"max_tokens\": 4096,
    \"system\": $(echo "$SYSTEM_PROMPT" | jq -Rs .),
    \"messages\": [{ \"role\": \"user\", \"content\": $(echo "$USER_PROMPT" | jq -Rs .) }]
  }")

# Extract text from response
CONTENT_TEXT=$(echo "$RESPONSE" | jq -r '.content[0].text // empty')
if [[ -z "$CONTENT_TEXT" ]]; then
  echo "ERROR: No content in Claude response"
  echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
  exit 1
fi

# Clean markdown fences
CLEANED="${CONTENT_TEXT}"
[[ "$CLEANED" == *"```"* ]] && CLEANED=$(echo "$CLEANED" | sed 's/^```[a-z]*//;s/```$//')
CONTENT_JSON=$(echo "$CLEANED" | jq . 2>/dev/null || echo "{}")
if [[ "$CONTENT_JSON" == "{}" ]]; then
  echo "WARN: Could not parse JSON from response, saving raw"
  echo "$CLEANED" > content-raw.txt
fi

echo "$CONTENT_JSON" | jq . > content.json
echo "   Saved to ${WORK_DIR}/content.json"
echo "   Business: $(echo "$CONTENT_JSON" | jq -r '.business_name // "N/A"')"
echo "   Headline: $(echo "$CONTENT_JSON" | jq -r '.headline // "N/A"')"
echo ""

if [[ "$DO_SITE" == true ]]; then
  echo "2. Preparing design spec and calling Claude API (site generation)..."
  DESIGN_SPEC="# Design Specification for Bollywood Multiplex

## Visual Design Brief
Design a professional multiplex website with navigation (Home, Movies, Showtimes, Facilities, Contact), hero section with cinema imagery, feature cards, address bar, amenity badges. Style: modern-dark, primary #2563EB.

## Style
- Preset: modern-dark
- Primary Color: #2563EB
- Category: multiplex
"

  SITE_PROMPT="Generate an Astro website based on the following.

## Design Specification
${DESIGN_SPEC}

## Content Data (JSON)
$(cat content.json)

## Files to Generate
Create these files as a JSON object (keys=file paths, values=file contents):
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

Rules: Tailwind CSS, read content from site.json, mobile-first, accessible. Return ONLY a JSON object, no markdown."

  SITE_RESPONSE=$(curl -s -X POST "https://api.anthropic.com/v1/messages" \
    -H "x-api-key: ${ANTHROPIC_API_KEY}" \
    -H "anthropic-version: 2023-06-01" \
    -H "Content-Type: application/json" \
    -d "{
      \"model\": \"claude-sonnet-4-20250514\",
      \"max_tokens\": 16000,
      \"system\": \"You are a senior frontend developer. Return ONLY a JSON object with file paths as keys and file contents as values. No explanation.\",
      \"messages\": [{ \"role\": \"user\", \"content\": $(echo "$SITE_PROMPT" | jq -Rs .) }]
    }")

  SITE_TEXT=$(echo "$SITE_RESPONSE" | jq -r '.content[0].text // empty')
  if [[ -n "$SITE_TEXT" ]]; then
    CLEANED_SITE="$SITE_TEXT"
    [[ "$CLEANED_SITE" == *"```"* ]] && CLEANED_SITE=$(echo "$CLEANED_SITE" | sed 's/^```[a-z]*//;s/```$//')
    echo "$CLEANED_SITE" | jq . > site-files.json 2>/dev/null || echo "$CLEANED_SITE" > site-files-raw.txt
    echo "   Saved to ${WORK_DIR}/site-files.json"
    FILE_COUNT=$(echo "$CLEANED_SITE" | jq 'keys | length' 2>/dev/null || echo "0")
    echo "   Files generated: ${FILE_COUNT}"
  else
    echo "   WARN: No site content in response"
  fi
fi

echo ""
echo "=== Dry run complete ==="
echo "  Output: ${WORK_DIR}"
echo "  content.json — AI-generated business content"
[[ "$DO_SITE" == true ]] && echo "  site-files.json — Generated Astro components (if valid)"
echo ""
