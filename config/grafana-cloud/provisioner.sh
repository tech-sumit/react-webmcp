#!/bin/bash
###############################################################################
# Grafana Cloud Provisioner
# Pushes versioned dashboards and alert rules to Grafana Cloud via HTTP API.
# Idempotent -- safe to run multiple times.
#
# Usage: ./provisioner.sh [dashboards|alerts|all]
# Requires: GRAFANA_CLOUD_STACK_URL, GRAFANA_CLOUD_USER, GRAFANA_CLOUD_API_KEY
###############################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DASHBOARD_DIR="${SCRIPT_DIR}/dashboards"
ALERT_RULES_FILE="${SCRIPT_DIR}/alert-rules.yaml"

# Load .env if present
ENV_FILE="${SCRIPT_DIR}/../../.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

# Validate required environment variables
: "${GRAFANA_CLOUD_STACK_URL:?ERROR: GRAFANA_CLOUD_STACK_URL not set}"
: "${GRAFANA_CLOUD_USER:?ERROR: GRAFANA_CLOUD_USER not set}"
: "${GRAFANA_CLOUD_API_KEY:?ERROR: GRAFANA_CLOUD_API_KEY not set}"

GRAFANA_API="${GRAFANA_CLOUD_STACK_URL}/api"
AUTH_HEADER="Authorization: Bearer ${GRAFANA_CLOUD_API_KEY}"

# =============================================================================
# Functions
# =============================================================================

push_dashboard() {
  local file="$1"
  local name
  name=$(basename "$file" .json)

  echo "  Pushing dashboard: ${name}..."
  local response http_code body
  response=$(curl -s -w "\n%{http_code}" \
    -X POST "${GRAFANA_API}/dashboards/db" \
    -H "${AUTH_HEADER}" \
    -H "Content-Type: application/json" \
    -d @"$file")

  http_code="${response##*$'\n'}"
  body="${response%$'\n'*}"

  if [ "$http_code" -eq 200 ]; then
    echo "    OK: Dashboard '${name}' created/updated"
  else
    echo "    WARN: HTTP ${http_code} for '${name}': ${body}"
  fi
}

push_dashboards() {
  echo "=== Pushing Dashboards ==="
  if [ ! -d "$DASHBOARD_DIR" ]; then
    echo "  ERROR: Dashboard directory not found: ${DASHBOARD_DIR}"
    return 1
  fi

  local count=0
  for file in "${DASHBOARD_DIR}"/*.json; do
    [ -f "$file" ] || continue
    push_dashboard "$file"
    count=$((count + 1))
  done

  echo "  Done: ${count} dashboards pushed"
}

push_alerts() {
  echo "=== Pushing Alert Rules ==="
  if [ ! -f "$ALERT_RULES_FILE" ]; then
    echo "  ERROR: Alert rules file not found: ${ALERT_RULES_FILE}"
    return 1
  fi

  # Grafana Cloud expects alert rules via the provisioning API
  local response http_code body
  response=$(curl -s -w "\n%{http_code}" \
    -X POST "${GRAFANA_API}/v1/provisioning/alert-rules" \
    -H "${AUTH_HEADER}" \
    -H "Content-Type: application/yaml" \
    -H "X-Disable-Provenance: true" \
    --data-binary @"$ALERT_RULES_FILE")

  http_code="${response##*$'\n'}"
  body="${response%$'\n'*}"

  if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 202 ]; then
    echo "  OK: Alert rules provisioned"
  else
    echo "  ERROR: HTTP ${http_code}: ${body}"
    return 1
  fi
}

# =============================================================================
# Main
# =============================================================================

ACTION="${1:-all}"

case "$ACTION" in
  dashboards)
    push_dashboards
    ;;
  alerts)
    push_alerts
    ;;
  all)
    push_dashboards
    echo ""
    push_alerts
    ;;
  *)
    echo "Usage: $0 [dashboards|alerts|all]"
    exit 1
    ;;
esac

echo ""
echo "=== Provisioning Complete ==="
echo "Grafana Cloud URL: ${GRAFANA_CLOUD_STACK_URL}"
