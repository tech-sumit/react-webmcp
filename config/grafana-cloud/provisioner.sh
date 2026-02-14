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

# Use admin token (Editor service account) for provisioning; fall back to API key
GRAFANA_TOKEN="${GRAFANA_CLOUD_ADMIN_TOKEN:-${GRAFANA_CLOUD_API_KEY:?ERROR: Neither GRAFANA_CLOUD_ADMIN_TOKEN nor GRAFANA_CLOUD_API_KEY set}}"

GRAFANA_API="${GRAFANA_CLOUD_STACK_URL}/api"
AUTH_HEADER="Authorization: Bearer ${GRAFANA_TOKEN}"

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

  # Parse YAML into individual rules, push each via Grafana provisioning API
  local count=0
  python3 -c "
import yaml, json

with open('${ALERT_RULES_FILE}') as f:
    data = yaml.safe_load(f)

for g in data.get('groups', []):
    folder = g.get('folder', 'default')
    group_name = g.get('name', 'default')

    for rule in g.get('rules', []):
        payload = {
            'title': rule.get('title', ''),
            'condition': rule.get('condition', 'C'),
            'data': rule.get('data', []),
            'folderUID': folder,
            'ruleGroup': group_name,
            'for': rule.get('for', '0s'),
            'labels': rule.get('labels', {}),
            'annotations': rule.get('annotations', {}),
            'noDataState': 'OK',
            'execErrState': 'Alerting',
        }
        print(json.dumps({'folder': folder, 'title': rule.get('title',''), 'payload': payload}))
" | while IFS= read -r line; do
    local title folder payload_json
    title=$(echo "$line" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['title'])")
    folder=$(echo "$line" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['folder'])")
    payload_json=$(echo "$line" | python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin)['payload']))")

    # Ensure folder exists (ignore if already exists)
    curl -s -o /dev/null \
      -X POST "${GRAFANA_API}/folders" \
      -H "${AUTH_HEADER}" \
      -H "Content-Type: application/json" \
      -d "{\"uid\":\"${folder}\",\"title\":\"${folder}\"}" 2>/dev/null || true

    # Create alert rule
    local response http_code body
    response=$(curl -s -w "\n%{http_code}" \
      -X POST "${GRAFANA_API}/v1/provisioning/alert-rules" \
      -H "${AUTH_HEADER}" \
      -H "Content-Type: application/json" \
      -H "X-Disable-Provenance: true" \
      -d "$payload_json")

    http_code="${response##*$'\n'}"
    body="${response%$'\n'*}"

    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
      echo "  OK: ${title}"
    else
      echo "  WARN: HTTP ${http_code} for '${title}': ${body}"
    fi
  done

  echo "  Done: alert rules provisioned"
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
