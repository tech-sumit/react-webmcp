#!/bin/bash
###############################################################################
# health-check.sh -- Stack health verification
#
# Runs on the macOS host. Docker stack is local; OpenClaw is in the VM
# (reachable via localhost:OPENCLAW_PORT port forward).
# Exit code: 0 if all healthy, 1 if any unhealthy.
###############################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${SCRIPT_DIR}/.."

# Load .env
ENV_FILE="${PROJECT_DIR}/.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

N8N_URL="http://localhost:${N8N_PORT:-5678}"
VAULT_URL="http://localhost:${VAULT_PORT:-8200}"
OPENCLAW_URL="http://localhost:${OPENCLAW_PORT:-18789}"
HEALTHY=true

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check() {
  local name="$1"
  local status="$2"

  case "$status" in
    OK*)
      printf "  ${GREEN}✓${NC} %-25s %s\n" "$name" "$status"
      ;;
    WARN*)
      printf "  ${YELLOW}!${NC} %-25s %s\n" "$name" "${3:-$status}"
      ;;
    *)
      printf "  ${RED}✗${NC} %-25s %s\n" "$name" "$status"
      HEALTHY=false
      ;;
  esac
}

echo "=== Health Check (macOS host) ==="
echo ""

# --- Docker Containers ---
echo "Docker Containers:"
for container in $(docker compose -f "${PROJECT_DIR}/docker-compose.yml" ps --format '{{.Name}}' 2>/dev/null); do
  health=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$container" 2>/dev/null || echo "")
  state=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "not found")

  if [ -n "$health" ]; then
    status="$health"
  else
    status="$state"
  fi

  case "$status" in
    healthy|running)  check "$container" "OK" ;;
    starting)         check "$container" "OK (starting)" ;;
    unhealthy)        check "$container" "UNHEALTHY" ;;
    *)                check "$container" "FAIL: ${status}" ;;
  esac
done
echo ""

# --- n8n API ---
echo "n8n API:"
http_code=$(curl -s -o /dev/null -w "%{http_code}" "${N8N_URL}/healthz" 2>/dev/null || echo "000")
if [ "$http_code" = "200" ]; then
  check "n8n /healthz" "OK"
else
  check "n8n /healthz" "FAIL: HTTP ${http_code}"
fi

metrics_code=$(curl -s -o /dev/null -w "%{http_code}" "${N8N_URL}/metrics" 2>/dev/null || echo "000")
if [ "$metrics_code" = "200" ]; then
  check "n8n /metrics" "OK"
else
  check "n8n /metrics" "FAIL: HTTP ${metrics_code}"
fi
echo ""

# --- Vault ---
echo "Vault:"
vault_status=$(curl -s "${VAULT_URL}/v1/sys/seal-status" 2>/dev/null || echo '{}')
sealed=$(echo "$vault_status" | jq -r 'if has("sealed") then .sealed | tostring else "unknown" end')
if [ "$sealed" = "false" ]; then
  check "Vault seal status" "OK (unsealed)"
elif [ "$sealed" = "true" ]; then
  check "Vault seal status" "FAIL: SEALED"
else
  check "Vault seal status" "FAIL: unreachable"
fi
echo ""

# --- Redis ---
echo "Redis:"
redis_ping=$(docker exec n8n-redis redis-cli ${REDIS_PASSWORD:+-a "$REDIS_PASSWORD"} --no-auth-warning ping 2>/dev/null || echo "FAIL")
if [ "$redis_ping" = "PONG" ]; then
  check "Redis ping" "OK"
else
  check "Redis ping" "FAIL: ${redis_ping}"
fi
echo ""

# --- PostgreSQL ---
echo "PostgreSQL:"
pg_ready=$(docker exec n8n-postgres pg_isready -U "${POSTGRES_USER:-n8n}" 2>/dev/null || echo "FAIL")
if echo "$pg_ready" | grep -q "accepting connections"; then
  check "PostgreSQL" "OK"
else
  check "PostgreSQL" "FAIL"
fi
echo ""

# --- OpenClaw (in VM, via port forward) ---
echo "OpenClaw (VM):"
oc_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${OPENCLAW_URL}" 2>/dev/null || echo "000")
if [ "$oc_code" != "000" ]; then
  check "OpenClaw gateway" "OK (HTTP ${oc_code})"
else
  check "OpenClaw gateway" "FAIL: unreachable at ${OPENCLAW_URL}"
fi
echo ""

# --- Disk Usage (macOS) ---
echo "System:"
disk_usage=$(df -h / 2>/dev/null | tail -1 | awk '{print $5}' | tr -d '%')
if [ -n "$disk_usage" ] && [ "$disk_usage" -lt 80 ]; then
  check "Disk usage" "OK (${disk_usage}%)"
elif [ -n "$disk_usage" ] && [ "$disk_usage" -lt 90 ]; then
  check "Disk usage" "WARN" "${disk_usage}% used"
else
  check "Disk usage" "FAIL: ${disk_usage:-unknown}% used"
fi

# macOS memory via vm_stat
if command -v vm_stat &>/dev/null; then
  page_size=$(vm_stat | head -1 | grep -oE '[0-9]+')
  pages_free=$(vm_stat | awk '/Pages free/{gsub(/\./,""); print $3}')
  pages_inactive=$(vm_stat | awk '/Pages inactive/{gsub(/\./,""); print $3}')
  pages_active=$(vm_stat | awk '/Pages active/{gsub(/\./,""); print $3}')
  pages_wired=$(vm_stat | awk '/Pages wired/{gsub(/\./,""); print $4}')
  if [ -n "$pages_free" ] && [ -n "$pages_active" ] && [ -n "$pages_wired" ]; then
    total_used=$(( (pages_active + pages_wired) * page_size / 1048576 ))
    total_free=$(( (pages_free + pages_inactive) * page_size / 1048576 ))
    total=$(( total_used + total_free ))
    if [ "$total" -gt 0 ]; then
      mem_pct=$(( total_used * 100 / total ))
      if [ "$mem_pct" -lt 85 ]; then
        check "Memory" "OK (${mem_pct}% used, ${total_free}MB free)"
      else
        check "Memory" "WARN" "${mem_pct}% used"
      fi
    fi
  fi
fi

echo ""

# --- Summary ---
if [ "$HEALTHY" = true ]; then
  echo -e "${GREEN}=== All Checks Passed ===${NC}"
  exit 0
else
  echo -e "${RED}=== Some Checks Failed ===${NC}"
  exit 1
fi
