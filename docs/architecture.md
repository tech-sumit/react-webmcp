# Architecture

## System Overview

The AI-Native n8n Automation System has five layers:

1. **Infrastructure** -- Parallels Desktop VM provisioned via Terraform
2. **Automation Engine** -- n8n with PostgreSQL, Redis, Vault, Cloudflare Tunnel
3. **Observability** -- Grafana Alloy relaying to Grafana Cloud
4. **AI Agent** -- OpenClaw with custom skills
5. **CLI/Makefile** -- Developer interface

## Component Architecture

### macOS Host

The macOS host runs only:
- **Parallels Desktop** (hypervisor)
- **prldevops** Docker container (DevOps REST API for VM management)
- **Terraform CLI** (infrastructure as code)
- **Make CLI** (developer interface)

Nothing else runs directly on the host. All workloads are inside the VM.

### Parallels Ubuntu 24.04 VM

The VM runs the complete Docker Compose stack:

| Service | Purpose | Port |
|---------|---------|------|
| n8n | Workflow engine | 5678 |
| PostgreSQL | n8n database | 5432 (internal) |
| Vault | Secrets management | 8200 |
| vault-init | One-shot Vault setup | - |
| cloudflared | Tunnel for webhooks | - |
| Redis | Queue mode for n8n | 6379 (internal) |
| Alloy | Metrics + logs relay | - |
| cAdvisor | Container metrics | 8080 (internal) |
| node-exporter | VM system metrics | 9100 (internal) |

### Port Forwarding (VM -> Host)

| Host Port | VM Port | Service |
|-----------|---------|---------|
| 2222 | 22 | SSH |
| 5678 | 5678 | n8n |
| 8200 | 8200 | Vault |
| 18789 | 18789 | OpenClaw Gateway |

### Data Flow

1. **User/AI** -> Makefile -> SSH -> VM -> Docker Compose
2. **Webhooks** -> Cloudflare Tunnel -> n8n -> workflow execution
3. **Secrets** -> Vault -> n8n External Secrets
4. **Metrics** -> n8n/cAdvisor/node-exporter -> Alloy -> Grafana Cloud Mimir
5. **Logs** -> Docker stdout -> Alloy -> Grafana Cloud Loki
6. **Alerts** -> Grafana Cloud -> webhook -> n8n -> notification

### Shared Folder

Only the `shared/` directory is mounted into the VM via Parallels shared folders:
- `shared/workflows/` -- Version-controlled workflow JSONs
- `shared/credentials/` -- Encrypted credential exports (gitignored)
- `shared/exchange/` -- Ephemeral file exchange

The VM cannot see: `.env`, Terraform state, `.git/`, `host/` configs, or the macOS filesystem.

## Infrastructure as Code

Terraform manages four modules (conditional):
1. **parallels-vm** -- Always active. Creates and provisions the VM.
2. **cloudflare** -- Active when `CLOUDFLARE_API_TOKEN` is set. Manages DNS and tunnel.
3. **s3** -- Active when `AWS_ACCESS_KEY_ID` is set. Creates S3 buckets.
4. **github** -- Active when `GITHUB_TOKEN` is set. Creates repositories.

All configuration flows from a single `.env` file via `scripts/env-to-tfvars.sh`.

## Security Model

- All secrets in Vault, never in plaintext on disk
- `.env` and Terraform state are gitignored
- VM isolation: only `shared/` folder is visible
- Explicit port forwarding (4 ports only)
- Cloudflare WAF for webhook rate limiting
- Grafana Cloud API key scoped to specific stack
- OpenClaw telemetry redaction strips sensitive data
