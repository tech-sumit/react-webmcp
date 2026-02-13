# HashiCorp Vault Server Configuration
#
# NOTE: When run with -dev flag (as in docker-compose.yml), the storage block
# below is IGNORED -- dev mode always uses in-memory storage. Secrets are
# re-seeded by vault-init on every container start.
#
# To enable persistent storage: remove -dev from the docker-compose command
# and implement proper unsealing (manual, transit auto-unseal, etc.).

storage "file" {
  path = "/vault/file"
}

# listener "tcp" is handled by -dev mode via VAULT_DEV_LISTEN_ADDRESS
# Do NOT define a listener here when using -dev, or Vault will fail
# with "address already in use".

api_addr = "http://127.0.0.1:8200"

# Enable UI
ui = true

# Disable mlock for containers
disable_mlock = true

# Telemetry for Prometheus scraping
telemetry {
  disable_hostname = true
}
