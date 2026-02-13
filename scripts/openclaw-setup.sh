#!/bin/bash
###############################################################################
# openclaw-setup.sh -- Configure OpenClaw agent
#
# Pulls secrets from Vault, templates openclaw.json, starts daemon.
# Runs inside the VM after docker compose is up and Vault is seeded.
###############################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${SCRIPT_DIR}/.."
OPENCLAW_DIR="${PROJECT_DIR}/openclaw"
OPENCLAW_HOME="${HOME}/.openclaw"

# Load .env for secrets
ENV_FILE="${PROJECT_DIR}/.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

VAULT_ADDR="${VAULT_ADDR:-http://localhost:${VAULT_PORT:-8200}}"
VAULT_TOKEN="${VAULT_TOKEN:-${VAULT_ROOT_TOKEN:-}}"

echo "=== OpenClaw Setup ==="

# 1. Check OpenClaw (installed by Terraform provisioner)
echo "OpenClaw version: $(openclaw --version 2>/dev/null || echo 'not installed -- run terraform apply')"

# 2. Pull secrets from Vault
echo "Pulling secrets from Vault..."
# Preserve any value from environment before attempting Vault lookup
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

# 4. Template openclaw.json with secrets
echo "Templating openclaw.json..."
PROVIDER="${OPENCLAW_MODEL_PROVIDER:-anthropic}"
MODEL="${OPENCLAW_MODEL:-claude-sonnet-4-20250514}"
LOG_LEVEL="${OPENCLAW_LOG_LEVEL:-info}"
TELEMETRY="${OPENCLAW_TELEMETRY_ENABLED:-true}"
PORT="${OPENCLAW_PORT:-18789}"

# Coerce telemetry to boolean
case "$TELEMETRY" in
  true|1|yes) TELEMETRY_BOOL=true ;;
  *)          TELEMETRY_BOOL=false ;;
esac

N8N_MCP_URL="${N8N_MCP_URL:-http://localhost:5678/mcp/sse}"

jq -n \
  --arg provider "$PROVIDER" \
  --arg model "$MODEL" \
  --arg apiKey "$OPENCLAW_API_KEY" \
  --argjson port "$PORT" \
  --arg logLevel "$LOG_LEVEL" \
  --argjson telemetry "$TELEMETRY_BOOL" \
  --arg mcpUrl "$N8N_MCP_URL" \
  '{
    ai: { provider: $provider, model: $model, apiKey: $apiKey },
    gateway: { port: $port },
    logging: { level: $logLevel, consoleLevel: "warn" },
    plugins: {
      entries: {
        telemetry: {
          enabled: $telemetry,
          config: {
            enabled: $telemetry,
            redact: { enabled: true },
            integrity: { enabled: true },
            rateLimit: { enabled: true, maxEventsPerSecond: 100 },
            rotate: { enabled: true, maxSizeBytes: 52428800, maxFiles: 10 }
          }
        }
      }
    },
    mcp: {
      servers: {
        n8n: { type: "sse", url: $mcpUrl }
      }
    }
  }' > "${OPENCLAW_HOME}/openclaw.json"

echo "  Written: ${OPENCLAW_HOME}/openclaw.json"

# 5. Copy workspace files to OpenClaw home
echo "Copying workspace files..."
if [ -d "${OPENCLAW_DIR}/workspace" ]; then
  cp -r "${OPENCLAW_DIR}/workspace/"* "${OPENCLAW_HOME}/workspace/" 2>/dev/null || true
  echo "  Copied workspace files to ${OPENCLAW_HOME}/workspace/"
fi

# 6. Install daemon
echo "Installing OpenClaw daemon..."
openclaw onboard --install-daemon 2>/dev/null || \
  echo "  WARNING: Daemon installation may require manual setup"

# 7. Start gateway
echo "Starting OpenClaw gateway..."
openclaw gateway start 2>/dev/null || \
  echo "  WARNING: Gateway start may require manual intervention"

# 8. Verify
echo ""
echo "=== OpenClaw Setup Complete ==="
openclaw status 2>/dev/null || echo "  Run 'openclaw status' to verify"
