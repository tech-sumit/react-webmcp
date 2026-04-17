#!/bin/bash
###############################################################################
# nemoclaw-setup.sh -- Configure and start NemoClaw agent in the VM
#
# Onboards a sandbox, writes env config, and starts services.
# Runs inside the VM as the nemoclaw user. n8n is on the macOS host via HOST_IP.
###############################################################################
set -euo pipefail

HOST_IP="${HOST_IP:-10.211.55.2}"
N8N_PORT="${N8N_PORT:-5678}"
VAULT_PORT="${VAULT_PORT:-8200}"
VAULT_ADDR="http://${HOST_IP}:${VAULT_PORT}"
VAULT_TOKEN="${VAULT_ROOT_TOKEN:-${VAULT_TOKEN:-}}"
NEMOCLAW_PORT="${NEMOCLAW_PORT:-18789}"
NEMOCLAW_HOME="${HOME}/.nemoclaw"
NEMOCLAW_SANDBOX_NAME="${NEMOCLAW_SANDBOX_NAME:-panditai}"
NVM_DIR="${NVM_DIR:-${HOME}/.nvm}"

# Load nvm so nemoclaw CLI is on PATH
if [ -s "${NVM_DIR}/nvm.sh" ]; then
  . "${NVM_DIR}/nvm.sh"
fi

echo "=== NemoClaw Setup ==="
echo "  HOST_IP:  ${HOST_IP}"
echo "  n8n:      http://${HOST_IP}:${N8N_PORT}"
echo "  Sandbox:  ${NEMOCLAW_SANDBOX_NAME}"

if command -v nemoclaw &>/dev/null; then
  echo "  nemoclaw:  $(which nemoclaw)"
else
  echo "ERROR: nemoclaw not found on PATH. Run vm-provision-nemoclaw first."
  exit 1
fi

# Pull API key from Vault if available
echo "Pulling secrets from Vault at ${VAULT_ADDR}..."
local_api_key="${NEMOCLAW_API_KEY:-}"
NEMOCLAW_API_KEY=""

if [ -n "$VAULT_TOKEN" ]; then
  NEMOCLAW_API_KEY=$(curl -s \
    -H "X-Vault-Token: ${VAULT_TOKEN}" \
    "${VAULT_ADDR}/v1/secret/data/n8n/nemoclaw" 2>/dev/null | \
    jq -r '.data.data.api_key // empty') || true
fi

if [ -z "$NEMOCLAW_API_KEY" ]; then
  NEMOCLAW_API_KEY="${local_api_key}"
  if [ -n "$NEMOCLAW_API_KEY" ]; then
    echo "  Using NEMOCLAW_API_KEY from environment"
  fi
else
  echo "  Retrieved API key from Vault"
fi

NVIDIA_API_KEY="${NVIDIA_API_KEY:-}"
if [ -z "$NVIDIA_API_KEY" ]; then
  echo "  WARNING: NVIDIA_API_KEY not set. NemoClaw needs it for inference."
fi

mkdir -p "${NEMOCLAW_HOME}/logs"

# Write env file for NemoClaw services
cat > "${NEMOCLAW_HOME}/.env" << EOF
# n8n API (running on macOS host)
N8N_URL=http://${HOST_IP}:${N8N_PORT}
N8N_API_KEY=${N8N_API_KEY:-}
# Vault (running on macOS host)
VAULT_ADDR=${VAULT_ADDR}
VAULT_TOKEN=${VAULT_TOKEN}
# NVIDIA inference API key
NVIDIA_API_KEY=${NVIDIA_API_KEY}
# Anthropic (legacy, for fallback)
ANTHROPIC_API_KEY=${NEMOCLAW_API_KEY}
# Telegram bridge
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-}
# Sandbox config
NEMOCLAW_SANDBOX=${NEMOCLAW_SANDBOX_NAME}
DASHBOARD_PORT=${NEMOCLAW_PORT}
EOF
chmod 600 "${NEMOCLAW_HOME}/.env"
echo "  Written: ${NEMOCLAW_HOME}/.env"

# Export for nemoclaw CLI
export NVIDIA_API_KEY
export NEMOCLAW_NON_INTERACTIVE=1

# Firewall: allow the dashboard port
if command -v ufw &>/dev/null && sudo ufw status 2>/dev/null | grep -q "Status: active"; then
  sudo ufw allow "${NEMOCLAW_PORT}/tcp" comment 'NemoClaw dashboard' 2>/dev/null || true
  sudo ufw reload 2>/dev/null || true
fi

# Onboard NemoClaw (creates sandbox if not already done)
echo "Running nemoclaw onboard..."
if nemoclaw list 2>/dev/null | grep -q "${NEMOCLAW_SANDBOX_NAME}"; then
  echo "  Sandbox '${NEMOCLAW_SANDBOX_NAME}' already exists, skipping onboard."
else
  nemoclaw onboard --non-interactive || {
    echo "  WARNING: Onboarding requires NVIDIA_API_KEY. Set it and re-run."
  }
fi

# Start NemoClaw services (Telegram bridge, cloudflared tunnel)
echo "Starting NemoClaw services..."
set -a
. "${NEMOCLAW_HOME}/.env"
set +a

nemoclaw start 2>/dev/null || echo "  Services start skipped (may need sandbox first)"

echo ""
echo "=== NemoClaw Setup Complete ==="
nemoclaw status 2>/dev/null || echo "  Run 'nemoclaw status' to verify"
