#!/bin/bash
###############################################################################
# backup.sh -- Full backup (DB dump + workflow export + Vault snapshot)
#
# Usage:
#   backup.sh              Create a timestamped backup
#   backup.sh restore <path>  Restore from a backup
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

BACKUP_DIR="${BACKUP_DIR:-${PROJECT_DIR}/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/backup_${TIMESTAMP}"

cmd_backup() {
  echo "=== Creating Backup: ${BACKUP_PATH} ==="
  mkdir -p "$BACKUP_PATH"

  # 1. PostgreSQL dump
  echo "  [1/4] Dumping PostgreSQL..."
  docker exec n8n-postgres pg_dump \
    -U "${POSTGRES_USER:-n8n}" \
    -d "${POSTGRES_DB:-n8n}" \
    --format=custom \
    > "${BACKUP_PATH}/postgres.dump" 2>/dev/null

  if [ -f "${BACKUP_PATH}/postgres.dump" ] && [ -s "${BACKUP_PATH}/postgres.dump" ]; then
    echo "    OK: postgres.dump ($(du -h "${BACKUP_PATH}/postgres.dump" | cut -f1))"
  else
    echo "    WARN: PostgreSQL dump may have failed"
  fi

  # 2. Workflow export
  echo "  [2/4] Exporting workflows..."
  mkdir -p "${BACKUP_PATH}/workflows"
  if [ -d "${PROJECT_DIR}/shared/workflows" ]; then
    cp -r "${PROJECT_DIR}/shared/workflows/"*.json "${BACKUP_PATH}/workflows/" 2>/dev/null || true
  fi
  # Also export from n8n API
  "${SCRIPT_DIR}/sync-workflows.sh" export 2>/dev/null || true
  if [ -d "${PROJECT_DIR}/shared/workflows" ]; then
    cp -r "${PROJECT_DIR}/shared/workflows/"*.json "${BACKUP_PATH}/workflows/" 2>/dev/null || true
  fi
  local wf_count
  wf_count=$(ls -1 "${BACKUP_PATH}/workflows/"*.json 2>/dev/null | wc -l | tr -d ' ' || echo 0)
  echo "    OK: ${wf_count} workflows"

  # 3. Vault snapshot
  echo "  [3/4] Snapshotting Vault..."
  local vault_url="http://localhost:${VAULT_PORT:-8200}"
  curl -s \
    -H "X-Vault-Token: ${VAULT_ROOT_TOKEN:-}" \
    "${vault_url}/v1/sys/storage/raft/snapshot" \
    -o "${BACKUP_PATH}/vault-snapshot.snap" 2>/dev/null || true

  if [ -f "${BACKUP_PATH}/vault-snapshot.snap" ] && [ -s "${BACKUP_PATH}/vault-snapshot.snap" ]; then
    echo "    OK: vault-snapshot.snap"
  else
    # Fallback: export KV secrets
    echo "    WARN: Raft snapshot not available (dev mode), exporting KV..."
    curl -s \
      -H "X-Vault-Token: ${VAULT_ROOT_TOKEN:-}" \
      "${vault_url}/v1/secret/metadata/n8n?list=true" | jq . \
      > "${BACKUP_PATH}/vault-secrets-list.json" 2>/dev/null || true
    echo "    OK: vault-secrets-list.json"
  fi

  # 4. Metadata
  echo "  [4/4] Writing metadata..."
  cat > "${BACKUP_PATH}/metadata.json" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "hostname": "$(hostname)",
  "n8n_url": "${N8N_URL:-unknown}",
  "postgres_db": "${POSTGRES_DB:-n8n}",
  "workflow_count": ${wf_count}
}
EOF

  # Create compressed archive
  echo "  Compressing..."
  tar -czf "${BACKUP_PATH}.tar.gz" -C "${BACKUP_DIR}" "backup_${TIMESTAMP}"
  rm -rf "$BACKUP_PATH"

  local size
  size=$(du -h "${BACKUP_PATH}.tar.gz" | cut -f1)
  echo ""
  echo "=== Backup Complete ==="
  echo "  Path: ${BACKUP_PATH}.tar.gz"
  echo "  Size: ${size}"

  # Cleanup old backups (keep last 10)
  local backup_count
  backup_count=$(ls -1 "${BACKUP_DIR}"/backup_*.tar.gz 2>/dev/null | wc -l)
  if [ "$backup_count" -gt 10 ]; then
    echo "  Cleaning up old backups (keeping last 10)..."
    ls -1t "${BACKUP_DIR}"/backup_*.tar.gz | tail -n +11 | xargs rm -f
  fi
}

cmd_restore() {
  local backup_file="$1"

  if [ ! -f "$backup_file" ]; then
    echo "ERROR: Backup file not found: ${backup_file}"
    exit 1
  fi

  echo "=== Restoring from: ${backup_file} ==="

  local temp_dir
  temp_dir=$(mktemp -d)
  trap 'rm -rf "'"$temp_dir"'"' EXIT

  tar -xzf "$backup_file" -C "$temp_dir"
  local backup_dir
  backup_dir=$(ls -1 "$temp_dir" | head -1)

  # 1. Restore PostgreSQL
  if [ -f "${temp_dir}/${backup_dir}/postgres.dump" ]; then
    echo "  [1/3] Restoring PostgreSQL..."
    docker exec -i n8n-postgres pg_restore \
      -U "${POSTGRES_USER:-n8n}" \
      -d "${POSTGRES_DB:-n8n}" \
      --clean --if-exists \
      < "${temp_dir}/${backup_dir}/postgres.dump" 2>/dev/null || true
    echo "    OK: PostgreSQL restored"
  fi

  # 2. Restore workflows
  if [ -d "${temp_dir}/${backup_dir}/workflows" ]; then
    echo "  [2/3] Restoring workflows..."
    mkdir -p "${PROJECT_DIR}/shared/workflows"
    cp "${temp_dir}/${backup_dir}/workflows/"*.json "${PROJECT_DIR}/shared/workflows/" 2>/dev/null || true
    "${SCRIPT_DIR}/sync-workflows.sh" import 2>/dev/null || true
    echo "    OK: Workflows restored"
  fi

  # 3. Show metadata
  if [ -f "${temp_dir}/${backup_dir}/metadata.json" ]; then
    echo "  [3/3] Backup metadata:"
    jq . "${temp_dir}/${backup_dir}/metadata.json"
  fi

  echo ""
  echo "=== Restore Complete ==="
  echo "  You may need to restart n8n: docker compose restart n8n"
}

# =============================================================================
# Main
# =============================================================================

COMMAND="${1:-backup}"
shift || true

case "$COMMAND" in
  backup)   cmd_backup ;;
  restore)  cmd_restore "$@" ;;
  help|--help|-h)
    head -8 "$0" | tail -6
    ;;
  *)
    echo "Unknown command: ${COMMAND}" >&2
    exit 1
    ;;
esac
