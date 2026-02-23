#!/usr/bin/env bash
# ============================================================
# Website Factory — One-Time Setup Script
# ============================================================
# Run this once to initialize the Website Factory infrastructure:
#   1. Create SQLite database
#   2. Seed Vault secrets (interactive)
#   3. Push base template to GitHub
#   4. Verify all dependencies
#
# Usage:
#   cd projects/website-factory
#   ./scripts/setup.sh
#
# ============================================================

set -euo pipefail

# ── Constants ────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(dirname "$(dirname "$PROJECT_DIR")")"
DB_DIR="${REPO_ROOT}/data"
DB_PATH="${DB_DIR}/website-factory.db"

# ── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

log()   { echo -e "${BLUE}[setup]${NC} $*"; }
ok()    { echo -e "${GREEN}[setup] ✓${NC} $*"; }
warn()  { echo -e "${YELLOW}[setup] ⚠${NC} $*"; }
error() { echo -e "${RED}[setup] ✗${NC} $*" >&2; }
header(){ echo -e "\n${BOLD}━━━ $* ━━━${NC}\n"; }

# ============================================================
# Step 1: Check dependencies
# ============================================================
header "Checking dependencies"

MISSING=0

check_cmd() {
  if command -v "$1" &>/dev/null; then
    ok "$1 found: $(command -v "$1")"
  else
    error "$1 not found — please install it"
    MISSING=$((MISSING + 1))
  fi
}

check_cmd sqlite3
check_cmd git
check_cmd curl
check_cmd jq

# Check for Cursor CLI (agent command)
if command -v agent &>/dev/null; then
  ok "Cursor CLI (agent) found: $(command -v agent)"
else
  warn "Cursor CLI (agent) not found — install from https://cursor.com/install"
  warn "Site generation will not work without it"
fi

# Check for n8n availability
if curl -s --max-time 5 "http://localhost:5678/healthz" &>/dev/null; then
  ok "n8n is running on localhost:5678"
elif curl -s --max-time 5 "https://n8n.panditai.org/healthz" &>/dev/null; then
  ok "n8n is running at n8n.panditai.org"
else
  warn "n8n is not reachable — make sure it's running"
fi

if [[ ${MISSING} -gt 0 ]]; then
  error "${MISSING} required dependency(ies) missing. Please install them and re-run."
  exit 1
fi

# ============================================================
# Step 2: Create SQLite database
# ============================================================
header "Setting up SQLite database"

mkdir -p "${DB_DIR}"

if [[ -f "${DB_PATH}" ]]; then
  warn "Database already exists: ${DB_PATH}"
  read -rp "  Recreate it? (y/N) " RECREATE
  if [[ "${RECREATE}" =~ ^[Yy]$ ]]; then
    BACKUP="${DB_PATH}.bak.$(date +%Y%m%d%H%M%S)"
    mv "${DB_PATH}" "${BACKUP}"
    ok "Backed up existing DB to ${BACKUP}"
  else
    ok "Keeping existing database"
  fi
fi

if [[ ! -f "${DB_PATH}" ]]; then
  sqlite3 "${DB_PATH}" < "${PROJECT_DIR}/db/schema.sql"
  ok "Database created: ${DB_PATH}"

  # Verify tables
  TABLES=$(sqlite3 "${DB_PATH}" ".tables")
  ok "Tables: ${TABLES}"
fi

# ============================================================
# Step 3: Verify Vault secrets
# ============================================================
header "Checking Vault secrets"

VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
VAULT_TOKEN="${VAULT_ROOT_TOKEN:-}"

if [[ -z "${VAULT_TOKEN}" ]]; then
  # Try to read from .env
  if [[ -f "${REPO_ROOT}/.env" ]]; then
    VAULT_TOKEN=$(grep -E '^VAULT_ROOT_TOKEN=' "${REPO_ROOT}/.env" | cut -d'=' -f2 | tr -d '"' | tr -d "'")
  fi
fi

check_vault_secret() {
  local path="$1"
  local label="$2"
  local status="$3"

  if [[ -n "${VAULT_TOKEN}" ]]; then
    RESULT=$(curl -s -H "X-Vault-Token: ${VAULT_TOKEN}" \
      "${VAULT_ADDR}/v1/${path}" 2>/dev/null | jq -r '.data.data // empty' 2>/dev/null)
    if [[ -n "${RESULT}" && "${RESULT}" != "null" ]]; then
      ok "${label} — configured"
    else
      if [[ "${status}" == "required" ]]; then
        error "${label} — NOT SET (required)"
      else
        warn "${label} — not set yet (${status})"
      fi
    fi
  else
    warn "${label} — cannot verify (no Vault token)"
  fi
}

if [[ -n "${VAULT_TOKEN}" ]]; then
  check_vault_secret "secret/data/n8n/github" "GitHub token" "already set"
  check_vault_secret "secret/data/n8n/cloudflare" "Cloudflare API token" "already set"
  check_vault_secret "secret/data/n8n/openclaw" "Anthropic API key" "already set"
  check_vault_secret "secret/data/n8n/google-places" "Google Places API key" "new — needed"
  check_vault_secret "secret/data/n8n/openai" "OpenAI API key" "new — needed"
  check_vault_secret "secret/data/n8n/cursor" "Cursor API key" "new — needed"
  check_vault_secret "secret/data/n8n/sendgrid" "SendGrid API key" "optional"
else
  warn "VAULT_ROOT_TOKEN not available — skipping Vault checks"
  echo "  Set VAULT_ROOT_TOKEN in .env or export it to verify secrets"
fi

# ============================================================
# Step 4: Create /tmp workspace
# ============================================================
header "Setting up workspace"

WORKSPACE="/tmp/website-factory"
mkdir -p "${WORKSPACE}"
ok "Workspace directory: ${WORKSPACE}"

# ============================================================
# Step 5: Verify base template
# ============================================================
header "Verifying base template"

TEMPLATE_DIR="${PROJECT_DIR}/base-template"

REQUIRED_TEMPLATE_FILES=(
  "package.json"
  "astro.config.mjs"
  "tailwind.config.mjs"
  "tsconfig.json"
  "src/pages/index.astro"
  "src/layouts/Layout.astro"
  "src/styles/global.css"
  "public/admin/index.html"
  "public/admin/config.yml"
  "content/site.json"
  ".github/workflows/deploy.yml"
)

ALL_PRESENT=true
for f in "${REQUIRED_TEMPLATE_FILES[@]}"; do
  if [[ -f "${TEMPLATE_DIR}/${f}" ]]; then
    ok "${f}"
  else
    error "Missing: ${f}"
    ALL_PRESENT=false
  fi
done

if [[ "${ALL_PRESENT}" == true ]]; then
  ok "All base template files present"
else
  error "Base template is incomplete"
  exit 1
fi

# ============================================================
# Step 6: Summary
# ============================================================
header "Setup Summary"

echo -e "  Database:        ${GREEN}${DB_PATH}${NC}"
echo -e "  Base Template:   ${GREEN}${TEMPLATE_DIR}${NC}"
echo -e "  Workspace:       ${GREEN}${WORKSPACE}${NC}"
echo -e "  Prompts:         ${GREEN}${PROJECT_DIR}/prompts/${NC}"
echo -e "  Scripts:         ${GREEN}${PROJECT_DIR}/scripts/${NC}"
echo ""
echo -e "  ${BOLD}Next steps:${NC}"
echo "    1. Add missing API keys to Vault (OpenAI, Cursor, Google Places)"
echo "    2. Push base template to GitHub as a template repo"
echo "    3. Register a GitHub OAuth app for Decap CMS"
echo "    4. Import the n8n workflow from workflow.json"
echo "    5. Test with a sample business:"
echo ""
echo "       ./scripts/generate-site.sh test-project-001"
echo ""
