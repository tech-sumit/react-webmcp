# Operations Guide

## Daily Operations

### Starting the System

```bash
# If VM is suspended/stopped
make start

# If everything is already running, just check status
make status
```

### Checking Health

```bash
# Quick status
make status

# Full health check
make health
```

### Viewing Logs

```bash
# All services
make logs

# Specific service
make logs SERVICE=n8n
make logs SERVICE=vault
make logs SERVICE=redis
make logs SERVICE=cloudflared
make logs SERVICE=alloy
```

### Working with Workflows

```bash
# List all workflows
make workflow-list

# Create a new workflow
make workflow-add NAME="daily-report"

# Enable/disable
make workflow-enable NAME="daily-report"
make workflow-disable NAME="daily-report"

# Manual trigger
make workflow-trigger NAME="daily-report"

# Debug a failing workflow
make workflow-debug NAME="daily-report"

# Sync workflows to/from disk
make workflows-export    # n8n -> disk (for git commit)
make workflows-import    # disk -> n8n (after git pull)
```

### Managing Secrets

```bash
# List secrets
make vault-list

# Add a secret
make vault-set KEY=github_token VALUE=ghp_xxxxx

# Read a secret
make vault-get KEY=github_token

# Open Vault UI
make vault-ui
```

## Makefile Reference

Run `make help` for a complete list. Key targets:

### Lifecycle
| Target | Description |
|--------|-------------|
| `make up` | Full bootstrap |
| `make start` | Start existing system |
| `make stop` | Stop + suspend VM |
| `make down` | Stop stack (VM stays) |
| `make restart` | Restart Docker stack |
| `make destroy` | Full teardown |
| `make status` | Show system status |

### Workflows
| Target | Description |
|--------|-------------|
| `make workflow-list` | List all workflows |
| `make workflow-add NAME="..."` | Create workflow |
| `make workflow-enable NAME="..."` | Activate |
| `make workflow-disable NAME="..."` | Deactivate |
| `make workflow-trigger NAME="..."` | Manual run |
| `make workflow-debug NAME="..."` | Debug errors |
| `make workflows-export` | n8n -> disk |
| `make workflows-import` | disk -> n8n |

### Infrastructure
| Target | Description |
|--------|-------------|
| `make tf-plan` | Preview changes |
| `make tf-apply` | Apply changes |
| `make vm-ssh` | SSH into VM |
| `make vm-sync` | Sync files to VM |

### Observability
| Target | Description |
|--------|-------------|
| `make logs` | Tail logs |
| `make health` | Health check |
| `make grafana` | Open Grafana Cloud |
| `make alerts` | Show firing alerts |
| `make logs-query QUERY='...'` | Query Loki |
| `make metrics-query QUERY='...'` | Query Prometheus |

### Backup
| Target | Description |
|--------|-------------|
| `make backup` | Create backup |
| `make restore BACKUP=path` | Restore backup |

## Backup Strategy

### Manual Backup
```bash
make backup
# Creates: backups/backup_YYYYMMDD_HHMMSS.tar.gz
```

### Backup Contents
- PostgreSQL database dump
- Workflow JSON exports
- Vault snapshot (or secret list)
- Metadata (timestamp, counts)

### Restore
```bash
make restore BACKUP=backups/backup_20260101_120000.tar.gz
make restart  # After restore
```

### Recommended Schedule
- Daily: `make backup` (automate with a cron workflow in n8n)
- Before major changes: manual backup
- Keep last 10 backups (auto-cleaned)

## Git Workflow

### After Creating/Modifying Workflows
```bash
make workflows-export
git add shared/workflows/
git commit -m "Update workflows"
```

### After Pulling Changes
```bash
git pull
make vm-sync           # Sync files to VM
make workflows-import  # Import new workflows
```

### Infrastructure Changes
```bash
# Edit terraform files
make tf-plan    # Review
make tf-apply   # Apply
make vm-sync    # Sync updated configs
```

## AI Agent

### Sending Messages
```bash
make agent MSG="What workflows are running?"
make agent MSG="Create a workflow that sends a Slack message every morning"
make agent MSG="Why is the daily-report workflow failing?"
```

### Agent Capabilities
The OpenClaw agent has 6 skills:
1. **n8n-manage**: Workflow CRUD
2. **n8n-debug**: Execution debugging
3. **observe**: Log/metric queries
4. **vault-manage**: Secret management
5. **terraform-infra**: Infrastructure changes
6. **system-ops**: Stack lifecycle

## Troubleshooting

### Container Won't Start
```bash
make logs SERVICE=<service-name>
docker inspect <container-name> --format='{{.State}}'
```

### n8n Execution Errors
```bash
make workflow-debug NAME="<workflow>"
make logs-query QUERY='{container_name="n8n"} |= "error"' START=30m
```

### Vault Sealed
```bash
make status  # Check Vault seal status
# Restart Vault init container
ssh -p 2222 parallels@localhost "cd /home/parallels/n8n && docker compose restart vault-init"
```

### VM Issues
```bash
make vm-status
prlctl list -a
prlctl status n8n-ai-worker
# Force restart if needed
prlctl restart n8n-ai-worker
make start
```
