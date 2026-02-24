# vault-manage Skill

HashiCorp Vault secrets management. Write, read, list, and delete secrets via make commands and API. Integrate with n8n External Secrets.

## Make Commands

| Command | Description |
|---------|-------------|
| `make vault-ui` | Open Vault UI in browser |
| `make vault-list` | List all secrets under secret/n8n/ |
| `make vault-get KEY=my-secret` | Read a secret |
| `make vault-set KEY=my-secret VALUE=abc` | Write a secret |
| `make vault-seed` | Write ZeroClaw + n8n API keys (auto-called by docker-up) |

## Vault API Reference (KV v2)

Base URL: `http://localhost:8200/v1`

### Authentication

Use `X-Vault-Token` header with `VAULT_ROOT_TOKEN` (from .env).

### KV v2 Paths

Mount: `secret/` (KV v2 engine)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/secret/data/n8n/:key` | Read secret (returns `data.data`) |
| POST | `/secret/data/n8n/:key` | Create/update secret |
| DELETE | `/secret/metadata/n8n/:key` | Delete secret (and versions) |
| GET | `/secret/metadata/n8n/:key` | List versions |
| LIST | `/secret/metadata/n8n` | List keys under path |

### Example: Read secret

```bash
curl -s -H "X-Vault-Token: $VAULT_ROOT_TOKEN" \
  http://localhost:8200/v1/secret/data/n8n/my-secret
```

### Example: Write secret

```bash
curl -s -X POST -H "X-Vault-Token: $VAULT_ROOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data":{"value":"secret-value"}}' \
  http://localhost:8200/v1/secret/data/n8n/my-secret
```

### Multi-field secrets

```json
{"data": {
  "api_key": "sk-xxx",
  "api_url": "https://api.example.com",
  "org_id": "org_123"
}}
```

Read individual fields from `data.data` in the response.

## n8n External Secrets Integration

n8n can reference Vault secrets via:
- Environment variables populated from Vault at runtime
- Custom credential types that fetch from Vault
- Workflow nodes that use `$env.VAR` or credential references

Ensure `vault-seed` has written required keys (e.g. `n8n-api-key`, `zeroclaw`) before n8n/ZeroClaw start.

## Credential Rotation Procedure

1. Generate new credential value
2. Write to Vault: `make vault-set KEY=cred-name VALUE=new-value`
3. Restart services that use it: `make restart` or restart specific container
4. Verify: `make vault-get KEY=cred-name` and test dependent workflows
5. Revoke/rotate old credential at source if applicable

## Best Practices

1. **Never hardcode**: All runtime secrets in Vault; `.env` only for bootstrap (root token, etc.)
2. **Least privilege**: Use Vault policies to limit access; avoid root token in production
3. **Audit**: Enable Vault audit logging; query via Loki for `container_name="vault"`
4. **Naming**: Use consistent paths like `secret/n8n/<service>/<key>`
5. **Rotation**: Document rotation procedures; automate where possible
