#!/bin/bash
###############################################################################
# openclaw-setup.sh -- Configure OpenClaw agent
#
# Uses `openclaw config set` CLI to configure properly.
# Runs inside the VM. n8n is on the macOS host, reachable via HOST_IP.
###############################################################################
set -euo pipefail

# These are passed as env vars from the Makefile
HOST_IP="${HOST_IP:-10.211.55.2}"
N8N_PORT="${N8N_PORT:-5678}"
VAULT_PORT="${VAULT_PORT:-8200}"
VAULT_ADDR="http://${HOST_IP}:${VAULT_PORT}"
VAULT_TOKEN="${VAULT_ROOT_TOKEN:-${VAULT_TOKEN:-}}"
OPENCLAW_PORT="${OPENCLAW_PORT:-18789}"
OPENCLAW_HOME="${HOME}/.openclaw"

echo "=== OpenClaw Setup ==="
echo "  HOST_IP: ${HOST_IP}"
echo "  n8n:     http://${HOST_IP}:${N8N_PORT}"

# 1. Check OpenClaw is installed
echo "OpenClaw version: $(openclaw --version 2>/dev/null || echo 'not installed')"

# 2. Pull secrets from Vault (running on host, reachable via HOST_IP)
echo "Pulling secrets from Vault at ${VAULT_ADDR}..."
local_api_key="${OPENCLAW_API_KEY:-}"
OPENCLAW_API_KEY=""

if [ -n "$VAULT_TOKEN" ]; then
  OPENCLAW_API_KEY=$(curl -s \
    -H "X-Vault-Token: ${VAULT_TOKEN}" \
    "${VAULT_ADDR}/v1/secret/data/n8n/openclaw" 2>/dev/null | \
    jq -r '.data.data.api_key // empty') || true
fi

# Fallback to environment variable
if [ -z "$OPENCLAW_API_KEY" ]; then
  OPENCLAW_API_KEY="${local_api_key}"
  if [ -n "$OPENCLAW_API_KEY" ]; then
    echo "  Using OPENCLAW_API_KEY from environment"
  fi
else
  echo "  Retrieved API key from Vault"
fi

if [ -z "$OPENCLAW_API_KEY" ]; then
  echo "WARNING: No OpenClaw API key found. Set via Vault or OPENCLAW_API_KEY env var."
fi

# 3. Create OpenClaw home directory
mkdir -p "${OPENCLAW_HOME}/workspace/skills"
mkdir -p "${OPENCLAW_HOME}/logs"
mkdir -p "${OPENCLAW_HOME}/agents/main/sessions"
mkdir -p "${OPENCLAW_HOME}/credentials"

# 4. Reset to clean config, then set values via CLI
echo "Configuring OpenClaw via CLI..."

# Remove stale config to start fresh
rm -f "${OPENCLAW_HOME}/openclaw.json"

# Set gateway mode, port, and bind to LAN (so host can reach via port forward)
openclaw config set gateway.mode local 2>/dev/null || true
openclaw config set gateway.port "$OPENCLAW_PORT" 2>/dev/null || true
openclaw config set gateway.bind lan 2>/dev/null || true

# Set model provider: Anthropic with API key
if [ -n "$OPENCLAW_API_KEY" ]; then
  echo "  Setting Anthropic API key..."
  openclaw config set models.providers.anthropic.apiKey "$OPENCLAW_API_KEY" 2>/dev/null || true
  openclaw config set agents.defaults.model.primary "anthropic/claude-sonnet-4-20250514" 2>/dev/null || true
fi

# Set workspace to the OpenClaw home directory
openclaw config set agents.defaults.workspace "${OPENCLAW_HOME}/workspace" 2>/dev/null || true

# Fix config file permissions (security audit flagged this)
chmod 600 "${OPENCLAW_HOME}/openclaw.json" 2>/dev/null || true
chmod 700 "${OPENCLAW_HOME}" 2>/dev/null || true

# Run doctor to fix any remaining issues
openclaw doctor --fix 2>/dev/null || true

# 5. Create .env with n8n connection info for skills/tools
cat > "${OPENCLAW_HOME}/.env" << EOF
# n8n API (running on macOS host)
N8N_URL=http://${HOST_IP}:${N8N_PORT}
N8N_API_KEY=${N8N_API_KEY:-}
# Vault (running on macOS host)
VAULT_ADDR=${VAULT_ADDR}
VAULT_TOKEN=${VAULT_TOKEN}
# Anthropic
ANTHROPIC_API_KEY=${OPENCLAW_API_KEY}
EOF
chmod 600 "${OPENCLAW_HOME}/.env"
echo "  Written: ${OPENCLAW_HOME}/.env"

# 6. Start gateway
echo "Starting OpenClaw gateway..."
# Kill any existing gateway process
pkill -f "openclaw gateway" 2>/dev/null || true
sleep 1

# Start gateway in background (--bind lan so host can reach via NAT port forward)
setsid openclaw gateway --port "${OPENCLAW_PORT}" --bind lan </dev/null > "${OPENCLAW_HOME}/logs/gateway.log" 2>&1 &
GATEWAY_PID=$!
echo "  Gateway started (PID: ${GATEWAY_PID})"

# Wait for gateway to be ready
sleep 5
if curl -s --max-time 3 "http://127.0.0.1:${OPENCLAW_PORT}" >/dev/null 2>&1; then
  echo "  Gateway reachable at port ${OPENCLAW_PORT}"
else
  echo "  WARNING: Gateway may still be starting. Check: curl http://localhost:${OPENCLAW_PORT}"
fi

# 7. Verify
echo ""
echo "=== OpenClaw Setup Complete ==="
openclaw status 2>/dev/null || echo "  Run 'openclaw status' to verify"
