# Skill: System Operations

## Description

Start/stop/restart the Docker stack, perform health checks, manage backups, and handle system lifecycle.

## When to Use

- Need to start, stop, or restart the system
- Need to check system health
- Need to create or restore backups
- System is misbehaving and needs diagnosis
- User asks about system status

## Stack Lifecycle

### Full bootstrap (from scratch)
```bash
make up
```

### Start existing system
```bash
make start    # Start VM + Docker stack
```

### Stop system
```bash
make stop     # Stop stack + suspend VM
make down     # Stop stack only (VM stays running)
```

### Restart services
```bash
make restart              # Restart all containers
# or specific service:
ssh -p 2222 parallels@localhost "cd /home/parallels/n8n && docker compose restart n8n"
```

### Full teardown
```bash
make destroy  # Terraform destroy (VM + cloud resources)
```

## Health Checks

### Quick status
```bash
make status   # VM state, containers, n8n health, Vault status
```

### Comprehensive health
```bash
make health   # All services, disk, memory, API endpoints
```

### Individual checks
```bash
# n8n
curl -s http://localhost:5678/healthz

# Vault
curl -s http://localhost:8200/v1/sys/seal-status | jq '.sealed'

# Redis (via Docker)
docker exec n8n-redis redis-cli ping

# PostgreSQL (via Docker)
docker exec n8n-postgres pg_isready -U n8n
```

## Backup & Restore

### Create backup
```bash
make backup
# Creates: backups/backup_YYYYMMDD_HHMMSS.tar.gz
# Contains: PostgreSQL dump, workflow JSONs, Vault snapshot, metadata
```

### Restore from backup
```bash
make restore BACKUP=backups/backup_20260101_120000.tar.gz
```

### Backup contents
- `postgres.dump` -- Full database dump
- `workflows/` -- Exported workflow JSONs
- `vault-snapshot.snap` -- Vault data (or `vault-secrets-list.json` in dev mode)
- `metadata.json` -- Timestamp, hostname, counts

## VM Operations

```bash
make vm-ssh          # SSH into VM
make vm-status       # DevOps API health
make vm-sync         # Rsync repo files to VM
make vm-reprovision  # Re-run setup scripts
```

## Log Access

```bash
make logs                  # All container logs
make logs SERVICE=n8n      # Specific service
make logs SERVICE=vault    # Vault logs
make logs SERVICE=redis    # Redis logs
```

## Troubleshooting Checklist

1. **Containers not starting**: `make logs` to check startup errors
2. **n8n unreachable**: Check port forwarding, container health
3. **Vault sealed**: Restart vault-init container
4. **Redis issues**: Check memory limit, connection count
5. **Disk full**: Check `df -h`, clean old backups, prune Docker images
6. **VM unresponsive**: `prlctl restart n8n-ai-worker`, then `make start`

## Emergency Procedures

### Vault is sealed
```bash
# Re-run init container
ssh -p 2222 parallels@localhost "cd /home/parallels/n8n && docker compose restart vault vault-init"
```

### Database corruption
```bash
make restore BACKUP=<latest-backup>
make restart
```

### Complete reset (preserve data)
```bash
make down
make vm-sync
make start
make health
```
