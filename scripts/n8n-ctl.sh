#!/bin/bash
###############################################################################
# n8n-ctl.sh -- Main CLI wrapper for n8n REST API operations
#
# Usage: n8n-ctl.sh <command> [options]
#
# Commands:
#   list                          List all workflows
#   get <id|name>                 Get workflow details
#   create <name> [--active]      Create a new workflow
#   update <id> <json-file>       Update workflow from JSON file
#   delete <id|name> [--force]    Delete a workflow
#   enable <id|name>              Activate a workflow
#   disable <id|name>             Deactivate a workflow
#   trigger <id|name>             Manually execute a workflow
#   executions <id> [--limit N]   List recent executions
#   execution-detail <exec-id>    Get execution details
#   debug <id|name>               Show last failed execution with error details
###############################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load .env
ENV_FILE="${SCRIPT_DIR}/../.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

N8N_URL="${N8N_URL:-http://localhost:${N8N_PORT:-5678}}"
N8N_API="${N8N_URL}/api/v1"
API_KEY="${N8N_API_KEY:?ERROR: N8N_API_KEY not set}"

# =============================================================================
# Helper Functions
# =============================================================================

api_call() {
  local method="$1"
  local endpoint="$2"
  shift 2
  local response http_code body
  response=$(curl -s -w "\n%{http_code}" -X "$method" \
    "${N8N_API}${endpoint}" \
    -H "X-N8N-API-KEY: ${API_KEY}" \
    -H "Content-Type: application/json" \
    "$@")
  http_code="${response##*$'\n'}"
  body="${response%$'\n'*}"
  if [ "$http_code" -ge 400 ] 2>/dev/null; then
    echo "ERROR: API returned HTTP ${http_code}" >&2
    echo "$body" >&2
    return 1
  fi
  echo "$body"
}

resolve_workflow_id() {
  local input="$1"
  # If it looks like a number, assume it's an ID
  if [[ "$input" =~ ^[0-9]+$ ]]; then
    echo "$input"
    return
  fi
  # Otherwise, search by name (use --arg to avoid jq injection)
  local id
  id=$(api_call GET "/workflows" | jq -r --arg name "$input" '.data[] | select(.name == $name) | .id' | head -1)
  if [ -z "$id" ] || [ "$id" = "null" ]; then
    echo "ERROR: Workflow '${input}' not found" >&2
    return 1
  fi
  echo "$id"
}

# =============================================================================
# Commands
# =============================================================================

cmd_list() {
  echo "=== Workflows ==="
  api_call GET "/workflows" | jq -r '.data[] | "\(.id)\t\(if .active then "ACTIVE" else "INACTIVE" end)\t\(.name)"' | \
    column -t -s $'\t'
}

cmd_get() {
  local id
  id=$(resolve_workflow_id "$1")
  api_call GET "/workflows/${id}" | jq .
}

cmd_create() {
  local name="$1"
  local active="${2:-false}"

  local payload
  payload=$(jq -n \
    --arg name "$name" \
    --argjson active "$( [ "$active" = "--active" ] && echo true || echo false )" \
    '{name: $name, nodes: [], connections: {}, active: $active, settings: {}}')

  echo "Creating workflow: ${name}..."
  local result
  result=$(api_call POST "/workflows" -d "$payload")
  local id
  id=$(echo "$result" | jq -r '.id')
  echo "Created workflow '${name}' with ID: ${id}"
  echo "$result" | jq .
}

cmd_update() {
  local id name json_file
  id=$(resolve_workflow_id "$1")
  name="$1"

  if [ -n "${2:-}" ]; then
    # Explicit file path provided
    json_file="$2"
  else
    # Auto-resolve file from workflow name using same sanitization as sync-workflows.sh
    local sanitized
    sanitized=$(echo "$name" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9._-]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//')
    json_file="${SCRIPT_DIR}/../shared/workflows/${sanitized}.json"
  fi

  if [ ! -f "$json_file" ]; then
    echo "ERROR: File not found: ${json_file}" >&2
    echo "  Export workflows first: bash scripts/sync-workflows.sh export" >&2
    return 1
  fi

  echo "Updating workflow ${id} from ${json_file}..."
  api_call PUT "/workflows/${id}" -d @"$json_file" | jq .
}

cmd_delete() {
  local id
  id=$(resolve_workflow_id "$1")
  local force="${2:-}"

  if [ "$force" != "--force" ]; then
    echo "Are you sure you want to delete workflow ${id}? (y/N)"
    read -r confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
      echo "Aborted."
      return 0
    fi
  fi

  echo "Deleting workflow ${id}..."
  api_call DELETE "/workflows/${id}" | jq .
}

cmd_enable() {
  local id
  id=$(resolve_workflow_id "$1")
  echo "Activating workflow ${id}..."
  api_call PATCH "/workflows/${id}" -d '{"active": true}' | jq .
}

cmd_disable() {
  local id
  id=$(resolve_workflow_id "$1")
  echo "Deactivating workflow ${id}..."
  api_call PATCH "/workflows/${id}" -d '{"active": false}' | jq .
}

cmd_trigger() {
  local id
  id=$(resolve_workflow_id "$1")
  echo "Triggering workflow ${id}..."
  api_call POST "/workflows/${id}/run" -d '{}' | jq .
}

cmd_executions() {
  local id
  id=$(resolve_workflow_id "$1")
  # Accept either positional (executions <id> 20) or flag (executions <id> --limit 20)
  local limit="10"
  if [ "${2:-}" = "--limit" ] && [ -n "${3:-}" ]; then
    limit="$3"
  elif [ -n "${2:-}" ] && [ "${2:-}" != "--limit" ]; then
    limit="$2"
  fi

  echo "=== Recent Executions for Workflow ${id} ==="
  api_call GET "/executions?workflowId=${id}&limit=${limit}" | \
    jq -r '.data[] | "\(.id)\t\(.status)\t\(.startedAt)\t\(.stoppedAt // "running")"' | \
    column -t -s $'\t'
}

cmd_execution_detail() {
  local exec_id="$1"
  api_call GET "/executions/${exec_id}" | jq .
}

cmd_debug() {
  local id
  id=$(resolve_workflow_id "$1")

  echo "=== Debug: Last Failed Execution for Workflow ${id} ==="
  local exec_data
  exec_data=$(api_call GET "/executions?workflowId=${id}&status=error&limit=1")

  local exec_id
  exec_id=$(echo "$exec_data" | jq -r '.data[0].id // empty')

  if [ -z "$exec_id" ]; then
    echo "No failed executions found for workflow ${id}"
    return 0
  fi

  echo "Execution ID: ${exec_id}"
  echo ""

  local detail
  detail=$(api_call GET "/executions/${exec_id}")

  echo "--- Execution Summary ---"
  echo "$detail" | jq '{
    id: .id,
    status: .status,
    startedAt: .startedAt,
    stoppedAt: .stoppedAt,
    workflowName: .workflowData.name
  }'

  echo ""
  echo "--- Error Details ---"
  echo "$detail" | jq '.data.resultData.error // "No error object found"'

  echo ""
  echo "--- Failed Node ---"
  echo "$detail" | jq '
    .data.resultData.runData
    | to_entries[]
    | select(.value[0].error != null)
    | {node: .key, error: .value[0].error.message, type: .value[0].error.name}
  ' 2>/dev/null || echo "Could not extract failed node details"
}

# =============================================================================
# Main
# =============================================================================

COMMAND="${1:-help}"
shift || true

case "$COMMAND" in
  list)              cmd_list ;;
  get)               cmd_get "$@" ;;
  create)            cmd_create "$@" ;;
  update)            cmd_update "$@" ;;
  delete)            cmd_delete "$@" ;;
  enable)            cmd_enable "$@" ;;
  disable)           cmd_disable "$@" ;;
  trigger)           cmd_trigger "$@" ;;
  executions)        cmd_executions "$@" ;;
  execution-detail)  cmd_execution_detail "$@" ;;
  debug)             cmd_debug "$@" ;;
  help|--help|-h)
    head -20 "$0" | tail -18
    ;;
  *)
    echo "Unknown command: ${COMMAND}" >&2
    echo "Run '$0 help' for usage" >&2
    exit 1
    ;;
esac
