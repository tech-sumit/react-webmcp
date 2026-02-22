# CLAUDE.md

## Project Overview

AI-Native Personal n8n Automation System. The 9-service Docker Compose stack runs directly on the **macOS host**. A Parallels Desktop Ubuntu 24.04 VM runs only the OpenClaw AI agent, which talks back to n8n over the Parallels host bridge IP (`10.211.55.2` by default).

## Architecture

```
macOS Host
├── Docker Compose (9 services — all run locally)
│     ├── n8n             – workflow engine       → localhost:5678
│     ├── PostgreSQL 16   – database
│     ├── Redis           – queue mode
│     ├── HashiCorp Vault – secrets               → localhost:8200
│     ├── Cloudflare Tunnel – webhook ingress
│     ├── Grafana Alloy   – metrics/logs relay
│     ├── cAdvisor        – container metrics
│     ├── node-exporter   – host system metrics
│     └── vault-init      – one-shot Vault bootstrap
└── Parallels VM (Ubuntu 24.04) — NAT port forwarding
      └── OpenClaw        – AI agent              → localhost:18789 (via VM NAT)
            └── Talks to host services via HOST_IP (10.211.55.2)
```

Port forwarding from VM: SSH → `localhost:2222`, OpenClaw → `localhost:18789`.
Observability: Grafana Alloy ships metrics (Mimir) and logs (Loki) to Grafana Cloud.
Secrets: all runtime secrets flow through HashiCorp Vault; `.env` holds only bootstrap credentials.

## Key Files

| File/Dir | Purpose |
|---|---|
| `Makefile` | Single CLI interface for all operations |
| `docker-compose.yml` | 9-service stack definition |
| `.env` | All runtime config — gitignored, generated from `.env.example` |
| `.env.example` | Template with all variable names and descriptions |
| `terraform/` | IaC: Parallels VM, Cloudflare, S3, GitHub (4 conditional modules) |
| `scripts/` | Operational scripts (n8n-ctl.sh, sync-workflows.sh, backup.sh, health-check.sh, generate-workflow.py) |
| `config/` | Service configs: Vault policy, PostgreSQL init, Grafana Alloy, Grafana Cloud provisioning |
| `docs/` | Architecture, setup guide, operations, observability docs, prompt templates |
| `shared/` | Host↔VM synced folder: workflows, credentials, exchange data |
| `n8n-templates/` | 8 260+ downloaded workflow templates + SQLite analysis DB |
| `openclaw/workspace/` | OpenClaw skills and workspace files synced to VM on setup |

## First-Time Setup

```bash
cp .env.example .env
make generate-secrets        # auto-fills: N8N_ENCRYPTION_KEY, POSTGRES_PASSWORD,
                             #   VAULT_ROOT_TOKEN, N8N_API_KEY, REDIS_PASSWORD,
                             #   PRLDEVOPS_ROOT_PASSWORD
# then manually fill in .env: N8N_WEBHOOK_URL and any optional vars
make check-env               # validate required vars are set
make up                      # full bootstrap (Terraform → Docker → VM → OpenClaw)
```

Required vars (`CORE_VARS`): `POSTGRES_PASSWORD`, `N8N_ENCRYPTION_KEY`, `N8N_WEBHOOK_URL`, `N8N_API_KEY`, `VAULT_ROOT_TOKEN`, `PRLDEVOPS_ROOT_PASSWORD`

Optional vars (features disabled if missing): `CLOUDFLARE_DOMAIN`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `GRAFANA_CLOUD_*`, `OPENCLAW_API_KEY`

## Common Commands

### System Lifecycle
```bash
make up              # Full bootstrap: Terraform + Docker + VM + OpenClaw
make start           # Start existing Docker stack + VM (no Terraform)
make stop            # Stop Docker stack + suspend VM
make down            # Stop Docker stack only (VM stays running)
make restart         # Restart Docker stack
make destroy         # Full teardown: Docker volumes + VM + Terraform resources
make status          # VM state, container health, n8n version, Vault seal status
make health          # Composite health check across all services
make check-env       # Validate .env has all required vars set
make generate-secrets # Auto-generate random values for internal secrets
```

### Workflows
```bash
make workflow-list
make workflow-add NAME="My Workflow"
make workflow-update NAME="My Workflow"          # push local JSON changes to n8n
make workflow-enable NAME="My Workflow"
make workflow-disable NAME="My Workflow"
make workflow-trigger NAME="My Workflow"
make workflow-delete NAME="My Workflow"
make workflow-logs NAME="My Workflow"            # fetch recent executions
make workflow-debug NAME="My Workflow"           # last execution with error details
make workflow-generate IDEA="Send Slack alert on new GitHub issue"   # deploy
make workflow-generate-preview IDEA="..."        # preview only, no deploy
make workflows-export      # n8n → disk (run before git commit)
make workflows-import      # disk → n8n (run after git pull)
```

### Vault / Secrets
```bash
make vault-ui                          # open Vault UI in browser
make vault-list                        # list all secrets under secret/n8n/
make vault-get KEY=my-secret
make vault-set KEY=my-secret VALUE=abc
make vault-seed                        # write OpenClaw + n8n API keys (auto-called by docker-up)
```

### Infrastructure
```bash
make tf-init         # terraform init
make tf-plan         # preview infrastructure changes
make tf-apply        # apply changes (also updates CLOUDFLARE_TUNNEL_TOKEN in .env)
make tf-destroy      # tear down Terraform-managed resources
```

### VM Management
```bash
make vm-ssh          # SSH into VM
make vm-status       # show VM state and IP
make vm-create       # create VM from Parallels template (idempotent)
make vm-ports        # configure NAT port forwarding (SSH + OpenClaw)
make vm-destroy      # stop, remove port rules, delete VM
make clean-devops    # remove prldevops service/binary (recovery when terraform destroy fails)
make ensure-prldevops # install prldevops binary to ~/bin if missing
make sudo-cache      # cache sudo credentials (needed before Parallels DevOps operations)
```

### AI Agent (OpenClaw)
```bash
make agent MSG="What workflows are running?"
make agent-status    # check OpenClaw status in VM
```

### Observability
```bash
make logs [SERVICE=n8n]                        # tail Docker container logs
make logs-query QUERY='{container_name="n8n"}' [START=1h]   # query Grafana Loki
make metrics-query QUERY='n8n_workflow_execution_total'       # query Grafana Prometheus
make grafana                                   # open Grafana Cloud in browser
make alerts                                    # show currently firing alerts
make dashboards-push                           # push versioned dashboard JSON to Grafana Cloud
make alerts-push                               # push versioned alert rules to Grafana Cloud
```

### Backup
```bash
make backup
make restore BACKUP=<path>
```

## Workflow Version Control

Workflow JSON files live in `shared/workflows/`. Always run `make workflows-export` before committing to capture the latest state from n8n. After pulling, run `make workflows-import` to push changes back into n8n.

## Secrets Model

Vault is the single source of truth at runtime. `.env` holds only bootstrap values (root tokens, internal service passwords). The `vault-init` container seeds Vault on first run; `make vault-seed` writes OpenClaw and n8n API keys and is called automatically by `make docker-up`. Do not hardcode secrets anywhere outside `.env`.

## Terraform Modules

Four modules under `terraform/`:
- `parallels-vm` — always applied; provisions the Ubuntu 24.04 VM via prldevops
- `cloudflare` — optional; Cloudflare DNS + tunnel (requires `CLOUDFLARE_*` vars)
- `s3` — optional; backup bucket
- `github` — optional; repo secrets/webhooks

Toggle modules via feature-flag vars in `.env`. `make tf-apply` automatically writes `CLOUDFLARE_TUNNEL_TOKEN` back to `.env` from Terraform output if Cloudflare is enabled.

## OpenClaw

OpenClaw is the AI agent running in the VM. It has 6 skills: `n8n-manage`, `n8n-debug`, `observe`, `vault-manage`, `terraform-infra`, `system-ops`. It talks to host services over `HOST_IP` (default `10.211.55.2`). Invoke from the host via `make agent MSG="..."`. Skills and workspace files are in `openclaw/workspace/` and synced to the VM during `make vm-setup-openclaw`.

## No Test Suite

This is an operations platform, not a software library. No automated tests or CI pipeline exist. Validate with `make health` and `make check-env`. Monitor via Grafana Cloud dashboards.

## Projects & Sub-repos

User projects live under `projects/` and are independently deployable:
- `projects/instagram-reels/`
- `projects/webmcp/`
- `projects/website-factory/`

Untracked sub-repos at the root (`pages-cms-docker/`, `webmcp-debugger-signing/`) are separate deployable units, not part of the core n8n stack.