#!/bin/bash
###############################################################################
# sync-workflows.sh -- Export/import n8n workflows to/from disk
#
# Usage:
#   sync-workflows.sh export    Export all workflows from n8n to shared/workflows/
#   sync-workflows.sh import    Import all workflows from shared/workflows/ to n8n
#   sync-workflows.sh diff      Show diff between n8n and disk versions
###############################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${SCRIPT_DIR}/.."
WORKFLOW_DIR="${PROJECT_DIR}/shared/workflows"

# Load .env
ENV_FILE="${PROJECT_DIR}/.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

N8N_URL="${N8N_URL:-http://localhost:${N8N_PORT:-5678}}"
N8N_API="${N8N_URL}/api/v1"
API_KEY="${N8N_API_KEY:?ERROR: N8N_API_KEY not set}"

api_call() {
  local method="$1"
  local endpoint="$2"
  shift 2
  curl -s -X "$method" \
    "${N8N_API}${endpoint}" \
    -H "X-N8N-API-KEY: ${API_KEY}" \
    -H "Content-Type: application/json" \
    "$@"
}

# Sanitize workflow name for filename
sanitize_name() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9._-]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//'
}

cmd_export() {
  echo "=== Exporting Workflows ==="
  mkdir -p "$WORKFLOW_DIR"

  local workflows
  workflows=$(api_call GET "/workflows")
  local count
  count=$(echo "$workflows" | jq '.data | length')

  echo "Found ${count} workflows"

  while read -r workflow; do
    local id name filename
    id=$(echo "$workflow" | jq -r '.id')
    name=$(echo "$workflow" | jq -r '.name')
    filename=$(sanitize_name "$name")

    # Fetch full workflow details
    local full_workflow
    full_workflow=$(api_call GET "/workflows/${id}")

    # Save with sorted keys for clean diffs
    echo "$full_workflow" | jq -S . > "${WORKFLOW_DIR}/${filename}.json"
    echo "  Exported: ${name} -> ${filename}.json"
  done < <(echo "$workflows" | jq -c '.data[]')

  echo "Done: ${count} workflows exported to ${WORKFLOW_DIR}"
}

cmd_import() {
  echo "=== Importing Workflows ==="

  if [ ! -d "$WORKFLOW_DIR" ]; then
    echo "ERROR: Workflow directory not found: ${WORKFLOW_DIR}"
    return 1
  fi

  local count=0
  for file in "${WORKFLOW_DIR}"/*.json; do
    [ -f "$file" ] || continue

    local name id
    name=$(jq -r '.name' "$file")
    id=$(jq -r '.id // empty' "$file")

    if [ -n "$id" ]; then
      # Try to update existing workflow
      echo "  Updating: ${name} (ID: ${id})..."
      local http_code
      http_code=$(curl -s -o /dev/null -w "%{http_code}" \
        -X PUT "${N8N_API}/workflows/${id}" \
        -H "X-N8N-API-KEY: ${API_KEY}" \
        -H "Content-Type: application/json" \
        -d @"$file")

      if [ "$http_code" -eq 200 ]; then
        echo "    Updated successfully"
      else
        echo "    Update failed (HTTP ${http_code}), creating new..."
        # Remove ID to create new
        local payload
        payload=$(jq 'del(.id)' "$file")
        api_call POST "/workflows" -d "$payload" > /dev/null
        echo "    Created as new workflow"
      fi
    else
      # Create new workflow
      echo "  Creating: ${name}..."
      api_call POST "/workflows" -d @"$file" > /dev/null
      echo "    Created successfully"
    fi

    count=$((count + 1))
  done

  echo "Done: ${count} workflows processed"
}

cmd_diff() {
  echo "=== Workflow Diff (n8n vs disk) ==="

  local temp_dir
  temp_dir=$(mktemp -d)
  trap 'rm -rf "'"$temp_dir"'"' EXIT

  # Export current n8n state to temp
  local workflows
  workflows=$(api_call GET "/workflows")

  while read -r workflow; do
    local id name filename
    id=$(echo "$workflow" | jq -r '.id')
    name=$(echo "$workflow" | jq -r '.name')
    filename=$(sanitize_name "$name")

    local full_workflow
    full_workflow=$(api_call GET "/workflows/${id}")
    echo "$full_workflow" | jq -S . > "${temp_dir}/${filename}.json"
  done < <(echo "$workflows" | jq -c '.data[]')

  # Compare
  local has_diff=false
  for file in "${WORKFLOW_DIR}"/*.json; do
    [ -f "$file" ] || continue
    local fname
    fname=$(basename "$file")

    if [ -f "${temp_dir}/${fname}" ]; then
      if ! diff -q <(jq -S . "$file") <(jq -S . "${temp_dir}/${fname}") > /dev/null 2>&1; then
        echo "  CHANGED: ${fname}"
        diff --color <(jq -S . "$file") <(jq -S . "${temp_dir}/${fname}") || true
        has_diff=true
      fi
    else
      echo "  DISK ONLY: ${fname} (not in n8n)"
      has_diff=true
    fi
  done

  for file in "${temp_dir}"/*.json; do
    [ -f "$file" ] || continue
    local fname
    fname=$(basename "$file")
    if [ ! -f "${WORKFLOW_DIR}/${fname}" ]; then
      echo "  N8N ONLY: ${fname} (not on disk)"
      has_diff=true
    fi
  done

  if [ "$has_diff" = false ]; then
    echo "  No differences found"
  fi
}

# =============================================================================
# Main
# =============================================================================

COMMAND="${1:-help}"

case "$COMMAND" in
  export)  cmd_export ;;
  import)  cmd_import ;;
  diff)    cmd_diff ;;
  help|--help|-h)
    head -10 "$0" | tail -8
    ;;
  *)
    echo "Unknown command: ${COMMAND}" >&2
    exit 1
    ;;
esac
