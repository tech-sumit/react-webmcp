#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -f "$PROJECT_ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_ROOT/.env"
  set +a
fi

BASE_URL="${CONTROL_PLANE_PUBLIC_BASE_URL:-http://127.0.0.1:8789}"

echo "==> Checking $BASE_URL/health"
curl -sf "$BASE_URL/health" | python3 -m json.tool

echo
echo "==> Verifying metrics endpoint"
curl -sf "$BASE_URL/metrics" >/dev/null
echo "Metrics endpoint is reachable."
