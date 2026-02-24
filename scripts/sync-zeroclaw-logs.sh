#!/bin/bash
###############################################################################
# Sync ZeroClaw logs from Parallels VM to host
# Runs continuously, syncing every INTERVAL seconds.
# Alloy reads from the host-side copy.
#
# Usage: ./sync-zeroclaw-logs.sh [interval_seconds]
###############################################################################
set -euo pipefail

INTERVAL="${1:-15}"
HOST_LOG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/data/zeroclaw-logs"
SSH_OPTS="-p 2222 -o StrictHostKeyChecking=no -o ConnectTimeout=5 -o BatchMode=yes"

mkdir -p "$HOST_LOG_DIR"

echo "Syncing ZeroClaw logs from VM to ${HOST_LOG_DIR} every ${INTERVAL}s"
echo "Press Ctrl+C to stop"

while true; do
  rsync -az --timeout=10 --rsync-path="sudo rsync" \
    -e "ssh ${SSH_OPTS}" \
    "parallels@localhost:/home/zeroclaw/.zeroclaw/logs/" "${HOST_LOG_DIR}/" 2>/dev/null || true
  rsync -az --timeout=10 --rsync-path="sudo rsync" \
    -e "ssh ${SSH_OPTS}" \
    "parallels@localhost:/tmp/zeroclaw/" "${HOST_LOG_DIR}/" 2>/dev/null || true
  sleep "$INTERVAL"
done
