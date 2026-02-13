#!/bin/bash
###############################################################################
# health-check.sh -- Stack health verification
#
# Checks all services and reports status.
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

N8N_URL="${N8N_URL:-http://localhost:${N8N_PORT:-5678}}"
VAULT_URL="http://localhost:${VAULT_PORT:-8200}"
HEALTHY=true

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check() {
  local name="$1"
  local status="$2"

  if [ "$status" = "OK" ]; then
    printf "  ${GREEN}✓${NC} %-25s %s\n" "$name" "$status"
  elif [ "$status" = "WARN" ]; then
    printf "  ${YELLOW}!${NC} %-25s %s\n" "$name" "${3:-Warning}"
  else
    printf "  ${RED}✗${NC} %-25s %s\n" "$name" "$status"
    HEALTHY=false
  fi
}

echo "=== Health Check ==="
echo ""

# --- Docker Containers ---
echo "Docker Containers:"
for container in n8n n8n-postgres n8n-vault n8n-redis n8n-cloudflared n8n-alloy n8n-cadvisor n8n-node-exporter; do
  status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || \
           docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || \
           echo "not found")

  case "$status" in
    healthy|running)  check "$container" "OK" ;;
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
sealed=$(echo "$vault_status" | jq -r '.sealed // "unknown"')
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

# --- n8n API ---
echo "System Info:"
api_code=$(curl -s -o /dev/null -w "%{http_code}" "${N8N_URL}/api/v1/workflows" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY:-}" 2>/dev/null || echo "000")
if [ "$api_code" = "200" ]; then
  check "n8n API" "OK (responsive)"
else
  check "n8n API" "FAIL: HTTP ${api_code}"
fi

# --- Disk Usage ---
disk_usage=$(df -h / 2>/dev/null | tail -1 | awk '{print $5}' | tr -d '%')
if [ -n "$disk_usage" ] && [ "$disk_usage" -lt 80 ]; then
  check "Disk usage" "OK (${disk_usage}%)"
elif [ -n "$disk_usage" ] && [ "$disk_usage" -lt 90 ]; then
  check "Disk usage" "WARN" "${disk_usage}% used"
else
  check "Disk usage" "FAIL: ${disk_usage:-unknown}% used"
fi

# --- Memory ---
if command -v free &>/dev/null; then
  mem_available=$(free -m | awk '/^Mem:/{print $7}')
  mem_total=$(free -m | awk '/^Mem:/{print $2}')
  if [ -n "$mem_available" ] && [ -n "$mem_total" ] && [ "$mem_total" -gt 0 ]; then
    mem_pct=$(( (mem_total - mem_available) * 100 / mem_total ))
    if [ "$mem_pct" -lt 85 ]; then
      check "Memory" "OK (${mem_pct}% used, ${mem_available}MB free)"
    else
      check "Memory" "WARN" "${mem_pct}% used"
    fi
  fi
else
  # macOS doesn't have free; skip or use vm_stat
  check "Memory" "OK (run inside VM for memory stats)"
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
