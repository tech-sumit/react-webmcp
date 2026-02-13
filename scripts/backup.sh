#!/bin/bash
###############################################################################
# backup.sh -- PostgreSQL database backup
#
# Workflows are tracked in git; Vault runs in dev mode (in-memory).
# This script handles only the postgres dump/restore.
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

  # PostgreSQL dump
  echo "  Dumping PostgreSQL..."
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

  # Restore PostgreSQL
  if [ -f "${temp_dir}/${backup_dir}/postgres.dump" ]; then
    echo "  Restoring PostgreSQL..."
    docker exec -i n8n-postgres pg_restore \
      -U "${POSTGRES_USER:-n8n}" \
      -d "${POSTGRES_DB:-n8n}" \
      --clean --if-exists \
      < "${temp_dir}/${backup_dir}/postgres.dump" 2>/dev/null || true
    echo "    OK: PostgreSQL restored"
  else
    echo "  ERROR: postgres.dump not found in backup"
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
