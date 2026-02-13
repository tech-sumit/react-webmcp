# Vault policy for n8n -- read-only access to n8n secrets
# Path: secret/data/n8n/* (KV v2 -- note the 'data' prefix)

path "secret/data/n8n/*" {
  capabilities = ["read", "list"]
}

path "secret/metadata/n8n/*" {
  capabilities = ["read", "list"]
}
