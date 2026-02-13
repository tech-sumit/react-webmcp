# Skill: Vault Secrets Management

## Description

CRUD operations on HashiCorp Vault KV v2 secrets, credential rotation, and audit.

## When to Use

- Need to store a new credential for a workflow
- Need to read or verify a stored secret
- Need to rotate credentials
- Need to list what secrets are available
- Setting up a new integration that requires API keys

## How to Use

### Write a secret
```bash
make vault-set KEY=my_api_key VALUE=sk-abc123
# or via API:
curl -s -X POST \
  -H "X-Vault-Token: $VAULT_ROOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data": {"value": "sk-abc123"}}' \
  "http://localhost:8200/v1/secret/data/n8n/my_api_key"
```

### Read a secret
```bash
make vault-get KEY=my_api_key
# or via API:
curl -s \
  -H "X-Vault-Token: $VAULT_ROOT_TOKEN" \
  "http://localhost:8200/v1/secret/data/n8n/my_api_key" | jq '.data.data'
```

### List all secrets
```bash
make vault-list
# or via API:
curl -s \
  -H "X-Vault-Token: $VAULT_ROOT_TOKEN" \
  "http://localhost:8200/v1/secret/metadata/n8n?list=true" | jq '.data.keys'
```

### Delete a secret
```bash
curl -s -X DELETE \
  -H "X-Vault-Token: $VAULT_ROOT_TOKEN" \
  "http://localhost:8200/v1/secret/data/n8n/my_api_key"
```

### Store multi-field secret
```bash
curl -s -X POST \
  -H "X-Vault-Token: $VAULT_ROOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data": {"username": "user", "password": "pass", "host": "example.com"}}' \
  "http://localhost:8200/v1/secret/data/n8n/my_service"
```

## Vault API Reference

- Base: `http://localhost:8200/v1`
- Auth: `X-Vault-Token` header with root token
- KV v2 paths:
  - Data: `secret/data/n8n/{key}` (read/write)
  - Metadata: `secret/metadata/n8n/{key}` (list/version info)
  - Delete: `secret/delete/n8n/{key}` (soft delete)
  - Destroy: `secret/destroy/n8n/{key}` (permanent delete)

## n8n Integration

n8n accesses Vault via its External Secrets feature:
- Settings > External Secrets > HashiCorp Vault
- Vault URL: `http://vault:8200`
- Secret path: `secret/n8n/`

Secret naming convention: `secret/n8n/{credential_name}` with underscore-separated keys (n8n constraint: alphanumeric + underscore only).

## Credential Rotation

1. Generate new credential from the external service
2. Write new value to Vault: `make vault-set KEY=name VALUE=new_value`
3. n8n External Secrets will pick up the new value automatically
4. Verify by triggering a test workflow
5. Revoke the old credential from the external service

## Best Practices

- Use descriptive key names (e.g., `github_api_token`, `openai_api_key`)
- Store related fields together (username + password + host)
- Never log secret values
- Rotate credentials regularly
- Audit access via Vault audit logs
