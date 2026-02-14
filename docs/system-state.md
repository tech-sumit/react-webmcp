# AI-Native n8n Automation System -- System State Document

**Last synchronized**: 2026-02-14  
**n8n version**: 2.7.5  
**OpenClaw version**: 2026.2.12  
**Platform**: macOS (arm64) + Parallels Desktop VM (Ubuntu 24.04 arm64)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Infrastructure Layout](#infrastructure-layout)
3. [Service Status & Endpoints](#service-status--endpoints)
4. [Docker Stack](#docker-stack)
5. [Parallels VM (OpenClaw)](#parallels-vm-openclaw)
6. [MCP Integration](#mcp-integration)
7. [n8n Workflows](#n8n-workflows)
8. [Terraform Infrastructure](#terraform-infrastructure)
9. [Knowledge Database](#knowledge-database)
10. [Known Issues & Limitations](#known-issues--limitations)
11. [Operational Runbook](#operational-runbook)
12. [Git History](#git-history)
13. [File Structure](#file-structure)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        macOS Host (arm64)                           │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                 Docker Desktop Stack                         │   │
│  │                                                              │   │
│  │  ┌─────────┐  ┌──────────┐  ┌───────┐  ┌───────┐          │   │
│  │  │  n8n    │  │ postgres │  │ vault │  │ redis │          │   │
│  │  │ :5678   │  │ :5432    │  │ :8200 │  │ :6379 │          │   │
│  │  └────┬────┘  └──────────┘  └───────┘  └───────┘          │   │
│  │       │                                                     │   │
│  │  ┌────┴──────┐  ┌─────────┐  ┌──────────┐  ┌───────────┐  │   │
│  │  │cloudflared│  │  alloy  │  │ cadvisor │  │ node-exp  │  │   │
│  │  │ (tunnel)  │  │ (logs)  │  │ (metrics)│  │ (metrics) │  │   │
│  │  └───────────┘  └─────────┘  └──────────┘  └───────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────┐    ┌────────────────────────┐             │
│  │   Cursor IDE         │    │   Cloudflare Tunnel     │             │
│  │   MCP: n8n + openclaw│    │   n8n.panditai.org      │             │
│  └─────────────────────┘    └────────────────────────┘             │
│                                                                     │
│  NAT Port Forwarding: 2222→22 (SSH), 18789→18789 (OpenClaw)       │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │            Parallels VM: n8n-ai-worker                       │   │
│  │            Ubuntu 24.04 (arm64 + Rosetta)                    │   │
│  │                                                              │   │
│  │  ┌──────────────────────────────────────┐                   │   │
│  │  │        OpenClaw Gateway              │                   │   │
│  │  │  ws://10.211.55.8:18789              │                   │   │
│  │  │  Agent: main (claude-sonnet-4)       │                   │   │
│  │  │  Tools: exec, read, write, browser,  │                   │   │
│  │  │         web_search, cron, message... │                   │   │
│  │  └──────────────────────────────────────┘                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

**Design principle**: Docker services run on the macOS host for native performance and simpler volume mounts. The Parallels VM exists solely to run the OpenClaw AI agent in an isolated Linux environment.

---

## Infrastructure Layout

| Component | Location | Access |
|-----------|----------|--------|
| n8n | Docker on host | `localhost:5678`, `https://n8n.panditai.org` |
| PostgreSQL | Docker on host | `localhost:5432` (internal) |
| Vault | Docker on host | `localhost:8200` |
| Redis | Docker on host | `localhost:6379` (internal) |
| Cloudflare Tunnel | Docker on host | Tunnels to `n8n.panditai.org` |
| Grafana Alloy | Docker on host | Sends metrics/logs to Grafana Cloud |
| cAdvisor | Docker on host | Container metrics collector |
| Node Exporter | Docker on host | Host metrics collector |
| OpenClaw Gateway | Parallels VM | `localhost:18789` (NAT), `ws://10.211.55.8:18789` (VM LAN) |
| OpenClaw Agent | Parallels VM | `openclaw agent --local --agent main` |

### Network Topology

- **Host IP (from VM perspective)**: `10.211.55.2`
- **VM IP (LAN)**: `10.211.55.8`
- **NAT Port Forwards**: SSH `2222→22`, OpenClaw `18789→18789`
- **Cloudflare Tunnel**: `n8n.panditai.org` → `http://n8n:5678`

---

## Service Status & Endpoints

### Docker Containers (8 running)

| Container | Status | Ports |
|-----------|--------|-------|
| `n8n` | healthy | `0.0.0.0:5678→5678` |
| `n8n-postgres` | healthy | `5432` (internal) |
| `n8n-vault` | healthy | `0.0.0.0:8200→8200` |
| `n8n-redis` | healthy | `6379` (internal) |
| `n8n-cloudflared` | running | (Cloudflare QUIC tunnel) |
| `n8n-alloy` | running | (Grafana telemetry) |
| `n8n-cadvisor` | healthy | `8080` (internal) |
| `n8n-node-exporter` | running | `9100` (internal) |

### Key Configuration

| Setting | Value |
|---------|-------|
| n8n execution mode | `regular` (changed from `queue` -- no worker service) |
| n8n protocol | `https` (via Cloudflare Tunnel) |
| Vault mode | `dev` (in-memory, auto-unsealed) |
| n8n admin | `admin@panditai.org` |
| Public URL | `https://n8n.panditai.org` |

### Parallels VM

| Property | Value |
|----------|-------|
| Name | `n8n-ai-worker` |
| Status | running |
| OS | Ubuntu 24.04 (arm64 + Rosetta) |
| Node.js | 22.22.0 |
| OpenClaw | 2026.2.12 (update 2026.2.13 available) |
| Gateway | `ws://10.211.55.8:18789` (LAN-bound) |
| Auth mode | Token (`1b6c6dde6e488ad4e79e5dc2ab550ca5`) |
| Agent model | `claude-sonnet-4-20250514` (200k context) |
| Gateway pairing | **Required but not configured** (see Known Issues) |

---

## Docker Stack

### docker-compose.yml Services

**9 services** orchestrated via Docker Compose:

1. **n8n** -- Core workflow automation engine
   - Image: `docker.n8n.io/n8nio/n8n:latest`
   - Depends on: postgres, redis, vault
   - Health check: `wget --spider http://localhost:5678/healthz`
   - Environment: 20+ variables (API key, encryption key, webhook URL, Vault, logging, metrics)

2. **postgres** -- Primary database
   - Image: `postgres:17-alpine`
   - Volume: `data/postgres`
   - Health check: `pg_isready`

3. **vault** -- HashiCorp Vault (secrets management)
   - Image: `hashicorp/vault:1.21`
   - Dev mode with root token from `.env`
   - Volume: `data/vault`

4. **vault-init** -- One-shot Vault seeder
   - Runs `config/vault/init.sh` to create policies and seed secrets

5. **redis** -- Bull queue backend / cache
   - Image: `redis:7-alpine`
   - Volume: `data/redis`

6. **cloudflared** -- Cloudflare Tunnel
   - Tunnels `n8n.panditai.org` to internal n8n
   - Mumbai (BOM) PoPs active

7. **alloy** -- Grafana Alloy (observability)
   - Collects Prometheus metrics + Docker logs
   - Forwards to Grafana Cloud

8. **cadvisor** -- Container metrics
9. **node-exporter** -- Host-level metrics (macOS compatible, no rslave)

---

## Parallels VM (OpenClaw)

### Setup Pipeline

```
make vm-create          # Clone from "Ubuntu 24.04 (with Rosetta)" template
make vm-ports           # NAT: 2222→22, 18789→18789
make vm-provision-openclaw  # Install Node.js 22 + openclaw@latest
make vm-setup-openclaw  # Configure + start gateway
```

### OpenClaw Agent Configuration

- **Config file**: `~/.openclaw/openclaw.json` (VM)
- **Workspace**: `~/.openclaw/workspace/` (synced from `openclaw/workspace/`)
- **Gateway**: Bound to LAN (`0.0.0.0:18789`), token auth
- **Model**: Anthropic Claude Sonnet 4 (`claude-sonnet-4-20250514`)
- **Tools available** (23 tools):
  - File: `read`, `edit`, `write`
  - System: `exec`, `process`
  - Web: `browser`, `web_search`, `web_fetch`
  - Visual: `canvas`, `image`
  - Communication: `message`, `tts`
  - Scheduling: `cron`
  - Agent management: `agents_list`, `sessions_*`, `gateway`
  - Memory: `memory_search`, `memory_get`
  - Infrastructure: `nodes`

### OpenClaw Workspace Files

| File | Purpose |
|------|---------|
| `AGENTS.md` | Agent behavior, routing, and tool configuration |
| `TOOLS.md` | Tool descriptions and usage instructions |
| `SOUL.md` | Agent personality and response style |
| `IDENTITY.md` | Agent identity and name |
| `USER.md` | User profile and preferences |
| `HEARTBEAT.md` | Periodic heartbeat configuration |

### Skills

| Skill | Description |
|-------|-------------|
| `healthcheck` | System health verification |
| `skill-creator` | Create new skills |
| `tmux` | Terminal multiplexer management |
| `weather` | Weather information |

---

## MCP Integration

### Cursor IDE Configuration (`~/.cursor/mcp.json`)

Two MCP servers configured:

#### 1. n8n MCP (Working)

| Property | Value |
|----------|-------|
| Transport | Streamable HTTP via `supergateway` |
| Endpoint | `https://n8n.panditai.org/mcp-server/http` |
| Auth | Bearer JWT token |
| Tools | `search_workflows`, `get_workflow_details`, `execute_workflow` |
| Status | **Fully operational** |

Verified capabilities:
- Search workflows (returns all MCP-enabled workflows)
- Get workflow details (full node/connection/trigger info)
- Execute workflows (webhook-based execution with result)

#### 2. OpenClaw MCP (Partial)

| Property | Value |
|----------|-------|
| Bridge | `openclaw-mcp` npm package (stdio transport) |
| Gateway URL | `http://127.0.0.1:18789` |
| Auth | Gateway token |
| Tools | `openclaw_chat`, `openclaw_status`, `openclaw_chat_async`, `openclaw_task_status`, `openclaw_task_list`, `openclaw_task_cancel` |
| Status | **Gateway pairing required** -- MCP bridge returns 405 |

**Workaround**: OpenClaw agent works via direct SSH + `openclaw agent --local --agent main --message "..."` from the VM.

### MCP-Enabled n8n Workflows

Only workflows with webhook/form/schedule/chat triggers that are published can be MCP-enabled. Currently enabled:

| Workflow | Trigger | Status |
|----------|---------|--------|
| MCP Test - Hello World | Webhook POST `/webhook/mcp-hello` | Active, MCP-enabled |

---

## n8n Workflows

### All Workflows in Instance

| ID | Name | Active | Created By |
|----|------|--------|------------|
| `w2MtAhvrWWXe7rJ8` | MCP Test - Hello World | Yes | Cursor (API) |
| `9cl6LOz8uen82lPF` | MCP Test - Get Weather | No | Cursor (API) |
| `KBhF3xj30x1Uo9PU` | Personal life manager with Telegram... | No | Template import |
| `2tXahVtl0oztokeQ` | OpenClaw Agent Workflow | Yes | OpenClaw (VM script) |
| `3GGKMSlOv34X7OgU` | OpenClaw Agent Workflow | No | OpenClaw (agent) |

### Webhook Endpoints

| Path | Method | Workflow |
|------|--------|----------|
| `/webhook/mcp-hello` | POST | MCP Test - Hello World |
| `/webhook/openclaw-agent-test` | POST | OpenClaw Agent Workflow |
| `/webhook/openclaw-test` | POST | OpenClaw Agent Workflow (2nd) |

---

## Terraform Infrastructure

### Modules

| Module | Status | Purpose |
|--------|--------|---------|
| `parallels-vm` | Always created | VM provisioning via Parallels DevOps API |
| `cloudflare` | Conditional (`cloudflare_api_token != ""`) | DNS + Tunnel management |
| `s3` | Conditional (`aws_access_key != ""`) | Backup storage (S3) |
| `github` | Conditional (`github_token != ""`) | Repository management |

### Provider Versions (locked)

| Provider | Version |
|----------|---------|
| Parallels Desktop | `~> 0.6.1` |
| Cloudflare | `~> 5.0` |
| AWS | `~> 5.0` |
| GitHub | `~> 6.0` |

---

## Knowledge Database

### Source Data

- **8,258 workflow templates** downloaded from `api.n8n.io`
- **48 templates** returned 404 (deleted/unpublished)
- **490 MB** total download size
- Scripts: `download_templates.py` (incremental, parallel), `analyze_templates.py`

### Analysis Results

| Metric | Value |
|--------|-------|
| Unique node types | 899 |
| Built-in nodes | 596 |
| AI/LangChain nodes | 83 |
| Community nodes | 220 |
| Average nodes/workflow | 14.7 |
| Median nodes/workflow | 12 |

### Workflow Archetypes

| Archetype | Count | % |
|-----------|-------|---|
| AI/LangChain Agent | 4,550 | 55.1% |
| Scheduled/Cron | 1,084 | 13.1% |
| Webhook-Driven | 691 | 8.4% |
| AI/LLM Integration | 82 | 1.0% |

### Top 10 Most-Used Nodes

| # | Node | Uses | Workflows | Category |
|---|------|------|-----------|----------|
| 1 | `httpRequest` | 11,155 | 4,077 | built-in |
| 2 | `code` | 10,106 | 3,920 | built-in |
| 3 | `set` | 9,704 | 4,197 | built-in |
| 4 | `if` | 6,201 | 3,419 | built-in |
| 5 | `googleSheets` | 5,656 | 2,490 | built-in |
| 6 | `agent` (AI) | 4,329 | 2,809 | ai |
| 7 | `lmChatOpenAi` | 3,339 | 2,040 | ai |
| 8 | `telegram` | 2,602 | 1,058 | built-in |
| 9 | `gmail` | 2,403 | 1,495 | built-in |
| 10 | `merge` | 2,381 | 1,605 | built-in |

### Top 10 Connection Patterns

| Source -> Target | Count |
|------------------|-------|
| `lmChatOpenAi` -> `agent` | 2,454 |
| `httpRequest` -> `code` | 1,695 |
| `httpRequest` -> `httpRequest` | 1,675 |
| `set` -> `httpRequest` | 1,561 |
| `outputParserStructured` -> `agent` | 1,373 |
| `code` -> `httpRequest` | 1,253 |
| `if` -> `httpRequest` | 1,234 |
| `if` -> `set` | 1,185 |
| `code` -> `if` | 1,120 |
| `code` -> `code` | 1,118 |

### Knowledge DB Files

| File | Size | Contents |
|------|------|----------|
| `node_knowledge_db.json` | 2.9 MB | Every node type: params, samples, credentials, connections |
| `connection_patterns.json` | 84 KB | Edge frequencies, chains, trigger patterns, fan-out |
| `workflow_patterns.json` | 31 KB | Complexity, triggers, combos, archetypes |
| `analysis_summary.md` | 63 KB | Human-readable 1,129-line reference report |

---

## Known Issues & Limitations

### Critical

1. **OpenClaw gateway pairing not configured** -- The WebSocket gateway requires device pairing (`1008: pairing required`). The `openclaw-mcp` Cursor bridge fails with HTTP 405 because it can't establish a WebSocket session. **Workaround**: Use `openclaw agent --local` via SSH into the VM.

### Moderate

2. **n8n `Secure` cookie over HTTP** -- n8n sets `Secure; SameSite=Lax` on the `n8n-auth` cookie, which means `curl -c/-b` doesn't work over plain HTTP from the VM (`http://10.211.55.2:5678`). **Workaround**: Extract the cookie from the `Set-Cookie` response header and pass it manually via `-H "Cookie: n8n-auth=..."`.

3. **EXECUTIONS_MODE was queue without worker** -- Fixed: changed default from `queue` to `regular` in `docker-compose.yml`. Queue mode requires a separate n8n worker container that was never configured.

4. **`X-Forwarded-For` rate-limiter warnings** -- Cloudflare Tunnel sends `X-Forwarded-For` headers but n8n's Express trust proxy is `false`. Non-blocking but noisy in logs.

### Minor

5. **node-exporter `rslave` not supported on macOS** -- Fixed: removed `,rslave` from volume mount in `docker-compose.yml`.

6. **OpenClaw update available** -- 2026.2.13 is available (currently running 2026.2.12).

7. **Vault dev mode** -- Data is in-memory; restarts lose secrets. Acceptable for development.

---

## Operational Runbook

### Daily Operations

```bash
make start          # Start Docker stack + resume VM
make stop           # Stop Docker stack + suspend VM
make status         # Check all services
make health         # Full health check
make logs           # Tail all container logs
make logs SERVICE=n8n  # Tail specific service
```

### Workflow Management

```bash
make workflow-list              # List all workflows
make workflow-add NAME=my-wf    # Create workflow
make workflow-enable NAME=my-wf # Activate
make workflow-trigger NAME=my-wf # Execute
make workflows-export           # Sync n8n → disk
make workflows-import           # Sync disk → n8n
```

### OpenClaw Agent

```bash
make agent MSG="Your task here"       # Send task to OpenClaw
make agent-status                     # Check OpenClaw status
make vm-ssh                           # SSH into VM

# Direct agent execution (from VM)
openclaw agent --local --agent main --message "..."
openclaw agent --local --agent main --json --timeout 120 --message "..."
```

### Backup & Recovery

```bash
make backup                # PostgreSQL dump
make restore BACKUP=file   # Restore from backup
```

### Infrastructure

```bash
make up         # Full bootstrap (Terraform + Docker + VM + OpenClaw)
make destroy    # Full teardown
make tf-plan    # Preview Terraform changes
make tf-apply   # Apply Terraform
```

### Template Database

```bash
cd n8n-templates
python3 -u download_templates.py   # Re-download/update templates
python3 -u analyze_templates.py    # Regenerate knowledge database
```

---

## Git History

| Commit | Message |
|--------|---------|
| `d152eb0` | feat: add n8n template downloader, analyzer, and node knowledge database |
| `6dce072` | refactor: run Docker stack on macOS host, VM for OpenClaw only |
| `16c4d2a` | fix: keep OpenClaw files in openclaw/, .cursor/ for Cursor only |
| `63b1987` | refactor: move prompts, rules, skills to .cursor/ |
| `498c6b7` | fix: on_destroy_script uses docker compose down instead of make destroy |
| `fb2cc07` | simplify: remove dead code, strip Cloudflare to tunnel-only, postgres-only backup |
| `8eda9e6` | feat: initial implementation of AI-native n8n automation system |

---

## File Structure

```
n8n/
├── .cursor/
│   ├── agents/env-guide.md           # Environment variable guide
│   └── plans/                        # Cursor plan files (4)
├── .env                              # Secrets (gitignored)
├── .env.example                      # Template with all variables
├── .gitignore
├── Makefile                          # 56 targets -- primary CLI
├── docs/system-state.md              # This document
├── docker-compose.yml                # 9 services
├── config/
│   ├── alloy/config.alloy            # Grafana Alloy configuration
│   ├── grafana-cloud/                # Dashboards + alert rules
│   ├── postgres/init.sql             # Database initialization
│   └── vault/
│       ├── vault-config.hcl          # Vault server config
│       ├── init.sh                   # Vault seeder script
│       └── policies/n8n-policy.hcl   # Vault access policy
├── scripts/
│   ├── openclaw-setup.sh             # VM OpenClaw provisioning
│   ├── health-check.sh               # System health checks
│   ├── backup.sh                     # PostgreSQL backup
│   ├── n8n-ctl.sh                    # Workflow CRUD operations
│   ├── sync-workflows.sh             # Workflow sync (disk <-> n8n)
│   └── env-to-tfvars.sh              # .env to Terraform vars
├── terraform/
│   ├── main.tf                       # Root module (4 sub-modules)
│   ├── variables.tf                  # All input variables
│   ├── outputs.tf                    # Outputs
│   ├── providers.tf                  # Provider configuration
│   └── modules/
│       ├── parallels-vm/             # VM creation via prlctl
│       ├── cloudflare/               # DNS + Tunnel
│       ├── s3/                       # Backup storage
│       └── github/                   # Repository management
├── openclaw/
│   └── workspace/                    # Synced to VM
│       ├── AGENTS.md                 # Agent config
│       ├── TOOLS.md                  # Tool definitions
│       ├── SOUL.md                   # Personality
│       ├── IDENTITY.md               # Identity
│       ├── USER.md                   # User profile
│       └── skills/                   # 6 custom skills
├── n8n-templates/
│   ├── download_templates.py         # Template fetcher (8,258 templates)
│   ├── analyze_templates.py          # Template analyzer (899 node types)
│   ├── categories.json               # n8n template categories
│   ├── workflows/                    # 490 MB downloaded JSONs (gitignored)
│   └── knowledge_db/
│       ├── analysis_summary.md       # Human-readable report (1,129 lines)
│       ├── node_knowledge_db.json    # Node reference (2.9 MB, 899 types)
│       ├── connection_patterns.json  # Edge/chain patterns (84 KB)
│       └── workflow_patterns.json    # Archetypes + combos (31 KB)
├── data/                             # Docker volumes (gitignored)
│   ├── n8n/                          # n8n file storage
│   ├── postgres/                     # PostgreSQL data
│   ├── vault/                        # Vault data (dev mode)
│   └── redis/                        # Redis persistence
├── shared/                           # Credential/data exchange
├── backups/                          # PostgreSQL backups
└── external/                         # Vendored Terraform provider (gitignored)
```

### Disk Usage

| Path | Size | Gitignored |
|------|------|------------|
| `n8n-templates/workflows/` | 490 MB | Yes |
| `data/` | 66 MB | Yes |
| `n8n-templates/knowledge_db/` | 3.1 MB | No |
| `external/` | ~50 MB | Yes |

---

*This document should be regenerated when significant infrastructure changes are made. Run the runtime state collection commands in the Makefile (`make status`, `make health`) for live verification.*
