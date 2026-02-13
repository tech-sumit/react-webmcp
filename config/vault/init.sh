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

echo "=== Vault Init: Complete ==="
echo "Vault is unsealed and configured."
echo "KV v2 engine: secret/"
echo "Policy: n8n-policy"
