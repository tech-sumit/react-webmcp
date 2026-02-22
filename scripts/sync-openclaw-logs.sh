#!/bin/bash
###############################################################################
# Sync OpenClaw logs from Parallels VM to host
# Runs continuously, syncing every INTERVAL seconds.
# Alloy reads from the host-side copy.
#
# Usage: ./sync-openclaw-logs.sh [interval_seconds]
###############################################################################
set -euo pipefail

INTERVAL="${1:-15}"
HOST_LOG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/data/openclaw-logs"
SSH_OPTS="-p 2222 -o StrictHostKeyChecking=no -o ConnectTimeout=5 -o BatchMode=yes"

mkdir -p "$HOST_LOG_DIR"

echo "Syncing OpenClaw logs from VM to ${HOST_LOG_DIR} every ${INTERVAL}s"
echo "Press Ctrl+C to stop"

while true; do
  # Sync gateway logs (owned by openclaw user — use sudo rsync)
  rsync -az --timeout=10 --rsync-path="sudo rsync" \
    -e "ssh ${SSH_OPTS}" \
    "parallels@localhost:/home/openclaw/.openclaw/logs/" "${HOST_LOG_DIR}/" 2>/dev/null || true
  # Sync runtime JSONL logs from /tmp/openclaw/ (also openclaw-owned — use sudo rsync)
  rsync -az --timeout=10 --rsync-path="sudo rsync" \
    -e "ssh ${SSH_OPTS}" \
    "parallels@localhost:/tmp/openclaw/" "${HOST_LOG_DIR}/" 2>/dev/null || true
  sleep "$INTERVAL"
done
