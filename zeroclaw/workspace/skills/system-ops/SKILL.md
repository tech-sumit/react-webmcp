# system-ops Skill

System operations for the n8n automation stack. Stack lifecycle, health checks, backup/restore, VM operations, and troubleshooting.

## Stack Lifecycle

| Command | Description |
|---------|-------------|
| `make up` | Full bootstrap: Terraform + Docker + VM + ZeroClaw |
| `make start` | Start existing Docker stack + VM (no Terraform) |
| `make stop` | Stop Docker stack + suspend VM |
| `make down` | Stop Docker stack only (VM stays running) |
| `make restart` | Restart Docker stack |
| `make destroy` | Full teardown: Docker volumes + VM + Terraform resources |

## Health Checks

### Composite

```bash
make status    # VM state, container health, n8n version, Vault seal status
make health    # Composite health check across all services
make check-env # Validate .env has all required vars set
```

### Individual curl checks

```bash
# n8n
curl -s http://localhost:5678/healthz

# Vault
curl -s http://localhost:8200/v1/sys/seal-status

# ZeroClaw gateway (port 42617)
curl -s http://localhost:42617/health
```

From VM, use `HOST_IP` (default 10.211.55.2) instead of localhost.

## Backup / Restore

```bash
make backup                    # Create backup
make restore BACKUP=<path>     # Restore from backup
```

## VM Operations

```bash
make vm-ssh          # SSH into VM
make vm-status       # Show VM state and IP
make vm-create       # Create VM from Parallels template (idempotent)
make vm-ports        # Configure NAT port forwarding (SSH + ZeroClaw)
make vm-destroy      # Stop, remove port rules, delete VM
```

ZeroClaw gateway port: **42617** (forwarded from VM to host).

## Log Access

```bash
make logs [SERVICE=n8n]   # Tail Docker container logs
```

ZeroClaw logs: synced to `data/zeroclaw-logs/` via `scripts/sync-zeroclaw-logs.sh`

## ZeroClaw CLI

- `zeroclaw agent -m 'MSG'` — Chat with agent
- `zeroclaw status` — System status
- `zeroclaw doctor` — Diagnostics
- `zeroclaw gateway` — Start gateway server

Config: `~/.zeroclaw/config.toml`

## Troubleshooting Checklist

1. [ ] `make check-env` — All required vars set?
2. [ ] `make status` — Containers running? Vault unsealed?
3. [ ] `make health` — All services responding?
4. [ ] `zeroclaw status` / `zeroclaw doctor` — ZeroClaw healthy?
5. [ ] Check logs: `make logs SERVICE=n8n` (or vault, redis, etc.)
6. [ ] Query Loki for errors: `make logs-query QUERY='{container_name="n8n"} |= "error"'`
7. [ ] Verify port forwarding: `make vm-ports` if ZeroClaw unreachable from host

## Emergency Procedures

**n8n unresponsive:**
```bash
make restart
# or: docker compose restart n8n
```

**Vault sealed:**
```bash
# Unseal with keys from .env or recovery process
vault operator unseal <key>
```

**Full recovery:**
```bash
make destroy   # Tear down everything
make up        # Full bootstrap
make restore BACKUP=<path>  # If backup exists
```

**ZeroClaw gateway down:**
```bash
# On VM:
zeroclaw gateway   # Or: sudo systemctl restart zeroclaw-gateway
zeroclaw doctor    # Diagnose
```
