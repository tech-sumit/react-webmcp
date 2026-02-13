#!/bin/sh
###############################################################################
# Vault Init Script
# Runs as a one-shot container after Vault is healthy.
# - Enables KV v2 secrets engine
# - Creates n8n access policy
# - Seeds initial secrets structure
###############################################################################
set -e

echo "=== Vault Init: Waiting for Vault to be ready ==="
until vault status > /dev/null 2>&1; do
  echo "Waiting for Vault..."
  sleep 2
done

echo "=== Vault Init: Vault is ready ==="

# Enable KV v2 secrets engine at secret/ (may already exist in dev mode)
vault secrets enable -path=secret -version=2 kv 2>/dev/null || \
  echo "KV v2 engine already enabled at secret/"

# Write n8n access policy
echo "=== Vault Init: Writing n8n policy ==="
vault policy write n8n-policy /vault/policies/n8n-policy.hcl

# Create the n8n secrets path structure
echo "=== Vault Init: Creating n8n secrets structure ==="
vault kv put secret/n8n/config initialized=true 2>/dev/null || \
  echo "Secret path already exists"

# Create AppRole for n8n (optional, for non-dev deployments)
echo "=== Vault Init: Setting up AppRole ==="
vault auth enable approle 2>/dev/null || \
  echo "AppRole auth already enabled"

vault write auth/approle/role/n8n \
  token_policies="n8n-policy" \
  token_ttl=1h \
  token_max_ttl=4h \
  secret_id_ttl=0 2>/dev/null || true

# Extract AppRole credentials for n8n (stored in Vault for retrieval)
echo "=== Vault Init: Extracting AppRole credentials ==="
ROLE_ID=$(vault read -format=json auth/approle/role/n8n/role-id 2>/dev/null | grep -o '"role_id":"[^"]*"' | cut -d'"' -f4) || true
SECRET_ID=$(vault write -format=json -f auth/approle/role/n8n/secret-id 2>/dev/null | grep -o '"secret_id":"[^"]*"' | cut -d'"' -f4) || true

if [ -n "$ROLE_ID" ] && [ -n "$SECRET_ID" ]; then
  # Store AppRole creds in Vault itself (accessible via root token)
  vault kv put secret/n8n/approle role_id="$ROLE_ID" secret_id="$SECRET_ID" 2>/dev/null || true
  echo "  AppRole credentials stored at secret/n8n/approle"
  echo "  Role ID: ${ROLE_ID}"
fi

echo "=== Vault Init: Complete ==="
echo "Vault is unsealed and configured."
echo "KV v2 engine: secret/"
echo "Policy: n8n-policy"
echo "AppRole: n8n (credentials at secret/n8n/approle)"
