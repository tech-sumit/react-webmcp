#!/bin/bash
###############################################################################
# zeroclaw-setup.sh -- Configure ZeroClaw agent
#
# Writes config.toml and starts the gateway service.
# Runs inside the VM. n8n is on the macOS host, reachable via HOST_IP.
###############################################################################
set -euo pipefail

# These are passed as env vars from the Makefile
HOST_IP="${HOST_IP:-10.211.55.2}"
N8N_PORT="${N8N_PORT:-5678}"
VAULT_PORT="${VAULT_PORT:-8200}"
VAULT_ADDR="http://${HOST_IP}:${VAULT_PORT}"
VAULT_TOKEN="${VAULT_ROOT_TOKEN:-${VAULT_TOKEN:-}}"
ZEROCLAW_PORT="${ZEROCLAW_PORT:-42617}"
ZEROCLAW_HOME="${HOME}/.zeroclaw"

echo "=== ZeroClaw Setup ==="
echo "  HOST_IP: ${HOST_IP}"
echo "  n8n:     http://${HOST_IP}:${N8N_PORT}"

# 1. Check ZeroClaw is installed
echo "ZeroClaw version: $(zeroclaw --version 2>/dev/null || echo 'not installed')"

# 2. Pull secrets from Vault (running on host, reachable via HOST_IP)
echo "Pulling secrets from Vault at ${VAULT_ADDR}..."
local_api_key="${ZEROCLAW_API_KEY:-}"
ZEROCLAW_API_KEY=""

if [ -n "$VAULT_TOKEN" ]; then
  ZEROCLAW_API_KEY=$(curl -s \
    -H "X-Vault-Token: ${VAULT_TOKEN}" \
    "${VAULT_ADDR}/v1/secret/data/n8n/zeroclaw" 2>/dev/null | \
    jq -r '.data.data.api_key // empty') || true
fi

# Fallback to environment variable
if [ -z "$ZEROCLAW_API_KEY" ]; then
  ZEROCLAW_API_KEY="${local_api_key}"
  if [ -n "$ZEROCLAW_API_KEY" ]; then
    echo "  Using ZEROCLAW_API_KEY from environment"
  fi
else
  echo "  Retrieved API key from Vault"
fi

if [ -z "$ZEROCLAW_API_KEY" ]; then
  echo "WARNING: No ZeroClaw API key found. Set via Vault or ZEROCLAW_API_KEY env var."
fi

# 3. Create ZeroClaw directories
mkdir -p "${ZEROCLAW_HOME}/workspace/skills"
mkdir -p "${ZEROCLAW_HOME}/logs"
mkdir -p "${ZEROCLAW_HOME}/state"

# 4. Write config.toml
echo "Writing ZeroClaw config..."

cat > "${ZEROCLAW_HOME}/config.toml" << EOF
api_key = "${ZEROCLAW_API_KEY}"
default_provider = "${ZEROCLAW_MODEL_PROVIDER:-anthropic}"
default_model = "${ZEROCLAW_MODEL:-claude-sonnet-4-20250514}"
default_temperature = 0.7

[gateway]
port = ${ZEROCLAW_PORT}
host = "0.0.0.0"
require_pairing = true
allow_public_bind = true

[autonomy]
level = "supervised"
workspace_only = true
allowed_commands = ["git", "npm", "cargo", "ls", "cat", "grep", "make", "curl", "jq", "find", "echo", "pwd", "wc", "head", "tail", "date"]
forbidden_paths = ["/etc", "/root", "/usr", "/bin", "/sbin", "/lib", "/opt", "/boot", "/dev"]
max_actions_per_hour = 100
max_cost_per_day_cents = 1000
require_approval_for_medium_risk = true
block_high_risk_commands = true
shell_env_passthrough = []
auto_approve = ["file_read"]
always_ask = []
allowed_roots = []
non_cli_excluded_tools = []

[memory]
backend = "sqlite"
auto_save = true
embedding_provider = "none"

[secrets]
encrypt = true

[identity]
format = "openclaw"
EOF

chmod 600 "${ZEROCLAW_HOME}/config.toml"
echo "  Written: ${ZEROCLAW_HOME}/config.toml"

# 5. Run doctor to validate config
zeroclaw doctor 2>/dev/null || true

# 6. Create .env with n8n connection info for skills/tools
cat > "${ZEROCLAW_HOME}/.env" << EOF
# n8n API (running on macOS host)
N8N_URL=http://${HOST_IP}:${N8N_PORT}
N8N_API_KEY=${N8N_API_KEY:-}
# Vault (running on macOS host)
VAULT_ADDR=${VAULT_ADDR}
VAULT_TOKEN=${VAULT_TOKEN}
# Anthropic
ANTHROPIC_API_KEY=${ZEROCLAW_API_KEY}
EOF
chmod 600 "${ZEROCLAW_HOME}/.env"
echo "  Written: ${ZEROCLAW_HOME}/.env"

# 7. Open firewall port for ZeroClaw (UFW is installed by Ansible)
if command -v ufw &>/dev/null && sudo ufw status 2>/dev/null | grep -q "Status: active"; then
  sudo ufw allow "${ZEROCLAW_PORT}/tcp" comment 'ZeroClaw gateway' 2>/dev/null || true
  sudo ufw reload 2>/dev/null || true
fi

# 8. Start gateway via systemd service (installed by Ansible)
echo "Starting ZeroClaw gateway..."

pkill -f "zeroclaw gateway" 2>/dev/null || true
sleep 2

sudo systemctl restart zeroclaw-gateway
echo "  Gateway started via systemd (auto-restart enabled)"

# Wait for gateway to be ready
sleep 5
if curl -s --max-time 3 "http://127.0.0.1:${ZEROCLAW_PORT}/health" >/dev/null 2>&1 || \
   sudo systemctl is-active --quiet zeroclaw-gateway; then
  echo "  Gateway active at port ${ZEROCLAW_PORT}"
else
  echo "  WARNING: Gateway may still be starting. Check: sudo systemctl status zeroclaw-gateway"
fi

# 9. Verify
echo ""
echo "=== ZeroClaw Setup Complete ==="
zeroclaw status 2>/dev/null || echo "  Run 'zeroclaw status' to verify"
