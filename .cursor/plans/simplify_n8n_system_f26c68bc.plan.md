---
name: Simplify n8n system
overview: Remove dead code, strip Cloudflare to tunnel-only, simplify backup to postgres-only, make Makefile resilient.
todos:
  - id: dead-code
    content: Remove AppRole from init.sh, duplicate n8n check from health-check.sh, duplicate OpenClaw install from openclaw-setup.sh
    status: completed
  - id: cloudflare-tunnel-only
    content: "Cloudflare: remove WAF + page rule (lines 52-83), update header"
    status: completed
  - id: backup-simplify
    content: "backup.sh: postgres dump only, remove workflow/vault/metadata sections"
    status: completed
  - id: makefile-resilience
    content: "Makefile: tier env vars, break up chain, remove workflow-archive"
    status: completed
  - id: minor-trim
    content: Remove queue_config from Alloy, yq fallback from provisioner.sh, hardcoded containers from health-check.sh
    status: completed
  - id: commit-simplify
    content: Commit with CHANGELOG update
    status: completed
isProject: false
---

# Simplify n8n System

## 1. Dead code

- **[config/vault/init.sh](config/vault/init.sh)**: Remove AppRole section (lines 32-53), update final echo (line 59) to drop AppRole reference. Circular in dev mode.
- **[scripts/health-check.sh](scripts/health-check.sh)**: Remove duplicate `/api/v1/workflows` check (lines 113-121). `/healthz` covers it.
- **[scripts/openclaw-setup.sh](scripts/openclaw-setup.sh)**: Remove npm install block (lines 28-32). Already in Terraform provisioner.

## 2. Cloudflare: tunnel only

- **[terraform/modules/cloudflare/main.tf](terraform/modules/cloudflare/main.tf)**: Delete WAF ruleset + page rule (lines 52-83). Update header to "Tunnel + DNS".

## 3. backup.sh: postgres only

- **[scripts/backup.sh](scripts/backup.sh)**: Remove workflow export (lines 44-57), Vault snapshot (lines 59-77), metadata (lines 79-90). Remove workflow restore (lines 142-149), metadata restore (lines 151-155). Update header + step numbering. Keep pg_dump, compress, rotation, pg_restore.

## 4. Makefile resilience

- **[Makefile](Makefile)**: Split into `CORE_VARS` (6) vs optional. Warn on missing optional, don't fail.
- Remove `dashboards-push alerts-push` from `up` chain. Run conditionally on `GRAFANA_CLOUD_STACK_URL`.
- Delete `workflow-archive` (duplicate of `workflow-disable`).

## 5. Minor trims

- **[config/alloy/config.alloy](config/alloy/config.alloy)**: Remove `queue_config` tuning block.
- **[config/grafana-cloud/provisioner.sh](config/grafana-cloud/provisioner.sh)**: Remove yq fallback (~30 lines).
- **[scripts/health-check.sh](scripts/health-check.sh)**: Replace hardcoded container list with `docker compose ps`.
