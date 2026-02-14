# AI-Native Personal n8n Automation System

A fully automated, AI-native personal n8n automation system running on a Parallels Desktop Ubuntu 24.04 VM with Docker Compose, HashiCorp Vault, Cloudflare Tunnel, Grafana Cloud observability, and an OpenClaw AI agent.

## Architecture

- **Infrastructure**: Parallels Desktop VM provisioned via Terraform
- **Automation Engine**: n8n workflow engine with PostgreSQL, Redis (queue mode), Vault (secrets)
- **Networking**: Cloudflare Tunnel for secure webhook ingress
- **Observability**: Grafana Alloy → Grafana Cloud (Mimir + Loki + dashboards + alerting)
- **AI Agent**: OpenClaw with 6 custom skills for managing the entire system
- **Interface**: Makefile with ~30 targets for all operations

## Prerequisites (macOS Host)

- **Parallels Desktop Pro or Business edition** (for DevOps API / Terraform provider)
- **Terraform CLI** (`brew install terraform`)
- **Git**

Everything else (Docker, Node.js, OpenClaw, etc.) is installed inside the VM automatically.

## Quick Start

```bash
# 1. Clone the repo
git clone <repo-url> ~/CODE/sumit/n8n && cd ~/CODE/sumit/n8n

# 2. Copy and fill in secrets
cp .env.example .env
make generate-secrets
# Edit .env with your external secrets (Cloudflare, Grafana Cloud, OpenClaw API key, domain)

# 3. Bootstrap everything
make up
```

## What `make up` Does

1. Validates all required environment variables
2. Runs `terraform apply` (creates Ubuntu 24.04 VM via Parallels Desktop)
3. Provisions VM with Docker, Node.js 22, OpenClaw CLI
4. Syncs repo files into VM via SCP
5. Starts 9-service Docker Compose stack (n8n, PostgreSQL, Vault, Redis, Cloudflared, Alloy, cAdvisor, node-exporter, vault-init)
6. Seeds Vault with secrets, configures OpenClaw agent
7. Pushes dashboards and alerts to Grafana Cloud
8. Runs health checks

## Daily Operations

```bash
make start          # Start existing VM + Docker stack
make stop           # Stop stack + suspend VM
make status         # Show VM state, container health
make vm-ssh         # SSH into the VM
make logs           # Tail container logs
make health         # Composite health check
make agent MSG="…"  # Talk to the AI agent
```

## Workflow Management

```bash
make workflow-list                   # List all workflows
make workflow-add NAME="my-flow"     # Create new workflow
make workflow-enable NAME="my-flow"  # Activate workflow
make workflows-export                # Sync n8n → disk
make workflows-import                # Sync disk → n8n
```

## Configuration

All configuration is in a single `.env` file. See `.env.example` for the complete variable catalog with defaults and descriptions. Internal secrets can be auto-generated with `make generate-secrets`.

## Documentation

All documentation lives in the [`docs/`](docs/) folder:

- [Architecture](docs/architecture.md) -- system layers, component layout, data flow
- [Setup Guide](docs/setup-guide.md) -- prerequisites, installation, bootstrap
- [Operations](docs/operations.md) -- daily ops, Makefile reference, backup, troubleshooting
- [Observability](docs/observability.md) -- dashboards, alerts, PromQL/LogQL queries
- [System State](docs/system-state.md) -- live system snapshot, service status, known issues
- [Changelog](CHANGELOG.md) -- release history

### AI Prompt Templates (`docs/prompts/`)

- [Workflow Design](docs/prompts/workflow-design.md) -- design a new n8n workflow from an idea
- [Workflow Debug](docs/prompts/workflow-debug.md) -- debug a failing workflow
- [Resource Plan](docs/prompts/resource-plan.md) -- plan infrastructure for a task
- [Task Decompose](docs/prompts/task-decompose.md) -- break a goal into actionable steps

### n8n Template Knowledge Base

- [Template Analysis Summary](n8n-templates/knowledge_db/analysis_summary.md) -- 8,258 templates analyzed, 899 node types catalogued

## Tear Down

```bash
make destroy    # Full teardown: VM + all Terraform-managed resources
```
