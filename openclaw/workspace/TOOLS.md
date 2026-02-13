# Available Tools

## Shell Commands

All operations are available via the `make` CLI. Key commands:

### Stack Lifecycle
- `make up` -- Full bootstrap (Terraform + Docker + OpenClaw)
- `make start` -- Start existing VM + Docker stack
- `make stop` -- Stop stack + suspend VM
- `make down` -- Stop Docker stack (VM stays running)
- `make restart` -- Restart Docker stack
- `make status` -- Show VM state, container health
- `make health` -- Comprehensive health check

### Workflow Management
- `make workflow-list` -- List all workflows
- `make workflow-add NAME="..."` -- Create new workflow
- `make workflow-update NAME="..."` -- Push local changes
- `make workflow-delete NAME="..."` -- Delete workflow
- `make workflow-enable NAME="..."` -- Activate
- `make workflow-disable NAME="..."` -- Deactivate
- `make workflow-trigger NAME="..."` -- Manual execute
- `make workflows-export` -- Sync n8n to disk
- `make workflows-import` -- Sync disk to n8n

### Debugging
- `make logs [SERVICE=n8n]` -- Tail container logs
- `make workflow-logs NAME="..."` -- Recent executions
- `make workflow-debug NAME="..."` -- Last error details
- `make logs-query QUERY='...' START=1h` -- Query Loki
- `make metrics-query QUERY='...'` -- Query Prometheus

### Secrets
- `make vault-set KEY=name VALUE=secret` -- Write secret
- `make vault-get KEY=name` -- Read secret
- `make vault-list` -- List all secrets

### Infrastructure
- `make tf-plan` -- Preview changes
- `make tf-apply` -- Apply changes
- `make vm-ssh` -- SSH into VM

### Backup
- `make backup` -- Full backup
- `make restore BACKUP=path` -- Restore

### Observability
- `make grafana` -- Open Grafana Cloud
- `make alerts` -- Show firing alerts
- `make dashboards-push` -- Update dashboards
- `make alerts-push` -- Update alert rules

## Direct API Access

### n8n REST API
- Base: `http://localhost:5678/api/v1`
- Auth: `X-N8N-API-KEY` header
- Key endpoints: `/workflows`, `/executions`, `/credentials`

### Vault API
- Base: `http://localhost:8200/v1`
- Auth: `X-Vault-Token` header
- n8n secrets: `secret/data/n8n/*`

### Grafana Cloud APIs
- PromQL: `POST {GRAFANA_CLOUD_PROMETHEUS_URL}/api/v1/query`
- LogQL: `POST {GRAFANA_CLOUD_LOKI_URL}/loki/api/v1/query_range`
- Auth: Basic auth with `GRAFANA_CLOUD_USER:GRAFANA_CLOUD_API_KEY`

## n8n MCP Tools

Workflows enabled as MCP tools are directly invocable. Check `openclaw.json` for the MCP server configuration.

## Scripts (Direct)

For lower-level operations, scripts in `scripts/` can be called directly:
- `scripts/n8n-ctl.sh` -- n8n API wrapper
- `scripts/sync-workflows.sh` -- Workflow sync
- `scripts/health-check.sh` -- Health verification
- `scripts/backup.sh` -- Backup/restore
