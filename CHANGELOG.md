# Changelog

## v0.1.1 -- Simplification Pass (2026-02-13)

Remove dead code, strip unused features, make startup resilient.

### Dead code removed
- Vault init.sh: removed AppRole auth section (circular in dev mode -- root token used everywhere)
- health-check.sh: removed duplicate `/api/v1/workflows` check (redundant with `/healthz`)
- openclaw-setup.sh: removed npm install block (already in Terraform provisioner)

### Cloudflare: tunnel only
- Removed WAF rate limiting ruleset and page rule from cloudflare module
- Cloudflare is used strictly for tunnel + DNS, nothing else

### Backup simplified
- backup.sh: stripped to PostgreSQL dump only (git tracks workflows, Vault is dev-mode in-memory)
- Removed workflow export, Vault snapshot, and metadata from backup/restore

### Makefile resilience
- Split REQUIRED_VARS into CORE_VARS (6) and OPTIONAL_VARS (9)
- check-env validates only core vars, warns on missing optional vars
- Removed dashboards-push/alerts-push from `up` chain; now runs conditionally inside setup-noninteractive
- Removed workflow-archive target (duplicate of workflow-disable)

### Minor trims
- Alloy config: removed queue_config tuning (defaults fine for ~100 samples/min)
- provisioner.sh: removed yq individual-rule fallback (30 lines); fails cleanly on error
- health-check.sh: container list now derived dynamically via `docker compose ps`

## v0.1.0 -- Initial Implementation (2026-02-13)

Full implementation of the AI-native n8n automation system per plan specification.

### Infrastructure
- Docker Compose stack with 9 services: n8n, PostgreSQL, Vault, vault-init, cloudflared, Redis, Alloy, cAdvisor, node-exporter
- Host Docker Compose for prldevops (Parallels DevOps API)
- Terraform modules: parallels-vm, cloudflare, s3, github
- VM provisioning script: Docker, Node.js 22, OpenClaw CLI

### Automation Engine
- n8n with queue mode (Redis), PostgreSQL persistence, Vault external secrets
- Cloudflare Tunnel for webhook ingress
- Workflow versioning via sync-workflows.sh (export/import/diff)

### Secrets Management
- HashiCorp Vault (dev mode) with KV v2 engine
- Root token auth for all services
- init.sh: auto-setup KV engine, policy, seed secrets

### Observability
- Grafana Alloy relaying metrics + logs to Grafana Cloud
- 5 pre-built dashboards (n8n, infrastructure, OpenClaw, Parallels, logs)
- 17 alert rules across n8n, OpenClaw, and Parallels
- provisioner.sh for idempotent dashboard/alert pushing

### AI Agent
- OpenClaw workspace with AGENTS.md, SOUL.md, TOOLS.md
- 6 custom skills: n8n-manage, n8n-debug, observe, vault-manage, terraform-infra, system-ops
- MCP integration with n8n
- 4 prompt templates: workflow-design, workflow-debug, resource-plan, task-decompose

### CLI
- Makefile with ~49 targets covering lifecycle, workflows, secrets, infrastructure, observability, backup, AI agent
- Single .env configuration surface with check-env validation and generate-secrets

### Post-Implementation Fixes

#### Critical
- n8n Vault auth: added VAULT_TOKEN for dev-mode access; init.sh now extracts AppRole credentials
- Internal Docker port: VAULT_ADDR hardcoded to port 8200 for inter-container networking (was using external VAULT_PORT variable)
- Bootstrap ordering: vault-seed now runs inside setup-noninteractive before openclaw-setup.sh
- Cloudflare tunnel: separated tunnel secret (random_id in Terraform) from connector token (JWT for cloudflared); tf-apply auto-updates .env
- MCP config: openclaw-setup.sh now includes mcp.servers.n8n block in deployed config
- on_destroy_script: changed from `make down` to `make destroy` per plan

#### Medium
- Redis healthcheck: includes password authentication when REDIS_PASSWORD is set
- health-check.sh Redis: added -a password flag to redis-cli ping
- workflow-update: n8n-ctl.sh auto-resolves sanitized filename from workflow name
- make alerts: uses correct Alertmanager API endpoint for firing alerts
- logs-query: uses basic auth consistent with metrics-query
- host/docker-compose.yml: port binding changed to 0.0.0.0 for VM accessibility
- backup.sh: VAULT_ROOT_TOKEN uses :- default to prevent set -u crash
- openclaw-setup.sh: now sources .env, respects VAULT_PORT

#### Cleanup
- Removed dead Terraform variables (vm_disk_size, vm_user, host_ip, cloudflare_tunnel_token)
- Removed deprecated N8N_BASIC_AUTH_* variables
- Added private key patterns to .gitignore
- observe skill: added Parallels disk I/O metrics, NL-to-query methodology section
