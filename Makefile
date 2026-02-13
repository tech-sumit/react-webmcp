###############################################################################
# AI-Native n8n Automation System -- Makefile
#
# All operations via `make` targets.
# Run `make help` for a full list of available commands.
###############################################################################

SHELL := /bin/bash
.DEFAULT_GOAL := help

# Load .env if it exists
-include .env
export

# Configuration with defaults
VM_USER     ?= parallels
VM_SSH_PORT ?= 2222
VM_SSH      := ssh -o StrictHostKeyChecking=no -p $(VM_SSH_PORT) $(VM_USER)@localhost
VM_SCP      := scp -o StrictHostKeyChecking=no -P $(VM_SSH_PORT)
PROJECT_DIR := /home/$(VM_USER)/n8n
N8N_PORT    ?= 5678
VAULT_PORT  ?= 8200
TZ          ?= UTC

# Core variables -- required for the stack to start
CORE_VARS := POSTGRES_PASSWORD N8N_ENCRYPTION_KEY N8N_WEBHOOK_URL N8N_API_KEY \
             VAULT_ROOT_TOKEN PRLDEVOPS_ROOT_PASSWORD

# Optional variables -- warn if missing, don't fail
OPTIONAL_VARS := CLOUDFLARE_DOMAIN CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID \
                 GRAFANA_CLOUD_PROMETHEUS_URL GRAFANA_CLOUD_LOKI_URL \
                 GRAFANA_CLOUD_USER GRAFANA_CLOUD_API_KEY GRAFANA_CLOUD_STACK_URL \
                 OPENCLAW_API_KEY

###############################################################################
# Configuration
###############################################################################

.PHONY: check-env
check-env: ## Validate core variables are set in .env (warn on optional)
	@if [ ! -f .env ]; then \
		echo "ERROR: .env file not found. Run: cp .env.example .env && make generate-secrets"; \
		exit 1; \
	fi
	@missing=""; \
	for var in $(CORE_VARS); do \
		val=$$(grep -E "^$$var=" .env 2>/dev/null | cut -d= -f2-); \
		if [ -z "$$val" ]; then missing="$$missing $$var"; fi; \
	done; \
	if [ -n "$$missing" ]; then \
		echo "ERROR: Missing required variables in .env:$$missing"; \
		echo "Copy .env.example to .env and fill in required values."; \
		exit 1; \
	fi
	@echo "Core variables OK."
	@warn=""; \
	for var in $(OPTIONAL_VARS); do \
		val=$$(grep -E "^$$var=" .env 2>/dev/null | cut -d= -f2-); \
		if [ -z "$$val" ]; then warn="$$warn $$var"; fi; \
	done; \
	if [ -n "$$warn" ]; then \
		echo "WARN: Optional variables not set (some features disabled):$$warn"; \
	fi

.PHONY: generate-secrets
generate-secrets: ## Generate random values for internal secrets
	@echo "Generating secrets..."
	@if [ ! -f .env ]; then cp .env.example .env; echo "Created .env from .env.example"; fi
	@grep -q '^N8N_ENCRYPTION_KEY=$$' .env 2>/dev/null && \
		sed -i '' "s/^N8N_ENCRYPTION_KEY=$$/N8N_ENCRYPTION_KEY=$$(openssl rand -hex 32)/" .env && \
		echo "  Generated N8N_ENCRYPTION_KEY" || true
	@grep -q '^POSTGRES_PASSWORD=$$' .env 2>/dev/null && \
		sed -i '' "s/^POSTGRES_PASSWORD=$$/POSTGRES_PASSWORD=$$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)/" .env && \
		echo "  Generated POSTGRES_PASSWORD" || true
	@grep -q '^VAULT_ROOT_TOKEN=$$' .env 2>/dev/null && \
		sed -i '' "s/^VAULT_ROOT_TOKEN=$$/VAULT_ROOT_TOKEN=$$(openssl rand -hex 16)/" .env && \
		echo "  Generated VAULT_ROOT_TOKEN" || true
	@grep -q '^PRLDEVOPS_ROOT_PASSWORD=$$' .env 2>/dev/null && \
		sed -i '' "s/^PRLDEVOPS_ROOT_PASSWORD=$$/PRLDEVOPS_ROOT_PASSWORD=$$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)/" .env && \
		echo "  Generated PRLDEVOPS_ROOT_PASSWORD" || true
	@grep -q '^N8N_API_KEY=$$' .env 2>/dev/null && \
		sed -i '' "s/^N8N_API_KEY=$$/N8N_API_KEY=$$(openssl rand -hex 24)/" .env && \
		echo "  Generated N8N_API_KEY" || true
	@grep -q '^REDIS_PASSWORD=$$' .env 2>/dev/null && \
		sed -i '' "s/^REDIS_PASSWORD=$$/REDIS_PASSWORD=$$(openssl rand -base64 16 | tr -d '/+=' | head -c 24)/" .env && \
		echo "  Generated REDIS_PASSWORD" || true
	@echo "Done. Review .env and fill in remaining REQUIRED values (Cloudflare, Grafana Cloud, OpenClaw API key)."

###############################################################################
# Lifecycle (VM + Stack)
###############################################################################

.PHONY: up
up: check-env tf-init tf-apply vm-sync vm-env setup-noninteractive health ## Full bootstrap: create VM + provision + start stack
	@echo ""
	@echo "=== System is UP ==="
	@echo "n8n:   http://localhost:$(N8N_PORT)"
	@echo "Vault: http://localhost:$(VAULT_PORT)"
	@echo "SSH:   ssh -p $(VM_SSH_PORT) $(VM_USER)@localhost"

.PHONY: start
start: ## Start existing VM + Docker stack (no Terraform)
	@echo "Starting VM..."
	prlctl start "$${VM_NAME:-n8n-ai-worker}" 2>/dev/null || true
	@echo "Waiting for VM SSH..."
	@for i in $$(seq 1 30); do \
		$(VM_SSH) "echo ready" 2>/dev/null && break || sleep 2; \
	done
	@echo "Starting Docker stack..."
	$(VM_SSH) "cd $(PROJECT_DIR) && docker compose up -d"
	@echo "VM and stack started."

.PHONY: stop
stop: ## Stop Docker stack + suspend VM
	@echo "Stopping Docker stack..."
	$(VM_SSH) "cd $(PROJECT_DIR) && docker compose stop" 2>/dev/null || true
	@echo "Suspending VM..."
	prlctl suspend "$${VM_NAME:-n8n-ai-worker}" 2>/dev/null || true
	@echo "Stopped."

.PHONY: down
down: ## Stop Docker stack gracefully (VM stays running)
	@echo "Stopping Docker stack..."
	$(VM_SSH) "cd $(PROJECT_DIR) && docker compose down"

.PHONY: destroy
destroy: ## Full teardown: Terraform destroy
	@echo "WARNING: This will destroy the VM and all Terraform-managed resources."
	@read -p "Are you sure? (y/N) " confirm && [ "$$confirm" = "y" ] || exit 1
	@source scripts/env-to-tfvars.sh && cd terraform && terraform destroy -auto-approve
	@echo "Destroyed."

.PHONY: restart
restart: ## Restart Docker stack inside VM
	$(VM_SSH) "cd $(PROJECT_DIR) && docker compose restart"

.PHONY: status
status: ## Show VM state, container health, n8n version, Vault seal status
	@echo "=== VM Status ==="
	@prlctl status "$${VM_NAME:-n8n-ai-worker}" 2>/dev/null || echo "VM not found"
	@echo ""
	@echo "=== Container Status ==="
	@$(VM_SSH) "cd $(PROJECT_DIR) && docker compose ps" 2>/dev/null || echo "Cannot reach VM"
	@echo ""
	@echo "=== n8n Health ==="
	@curl -s "http://localhost:$(N8N_PORT)/healthz" 2>/dev/null || echo "n8n unreachable"
	@echo ""
	@echo "=== Vault Status ==="
	@curl -s "http://localhost:$(VAULT_PORT)/v1/sys/seal-status" 2>/dev/null | jq '{sealed, version}' || echo "Vault unreachable"

###############################################################################
# VM Management
###############################################################################

.PHONY: vm-create
vm-create: ## Create + provision VM only (Terraform target)
	source scripts/env-to-tfvars.sh && cd terraform && terraform apply -target=module.parallels_vm -auto-approve

.PHONY: vm-destroy
vm-destroy: ## Destroy VM only
	source scripts/env-to-tfvars.sh && cd terraform && terraform destroy -target=module.parallels_vm -auto-approve

.PHONY: vm-ssh
vm-ssh: ## SSH into the VM
	$(VM_SSH)

.PHONY: vm-status
vm-status: ## VM health from DevOps API
	@curl -s http://localhost:8080/api/v1/vms 2>/dev/null | jq '.' || echo "DevOps API unreachable"

.PHONY: vm-reprovision
vm-reprovision: vm-sync ## Re-run provisioning scripts on existing VM
	$(VM_SSH) "cd $(PROJECT_DIR) && bash scripts/openclaw-setup.sh"

.PHONY: vm-env
vm-env: ## Copy .env to VM (required for docker compose)
	@echo "Copying .env to VM..."
	$(VM_SCP) .env $(VM_USER)@localhost:$(PROJECT_DIR)/.env
	@echo ".env copied."

.PHONY: vm-sync
vm-sync: ## Rsync repo files into VM via SSH
	@echo "Syncing files to VM..."
	rsync -avz --progress \
		-e "ssh -o StrictHostKeyChecking=no -p $(VM_SSH_PORT)" \
		--exclude '.env' \
		--exclude '.terraform/' \
		--exclude 'terraform.tfstate*' \
		--exclude '.git/' \
		--exclude 'host/' \
		--exclude 'data/' \
		--exclude 'backups/' \
		--exclude '.cursor/' \
		--exclude 'node_modules/' \
		--exclude '.DS_Store' \
		./ $(VM_USER)@localhost:$(PROJECT_DIR)/
	@echo "Sync complete."

###############################################################################
# Workflow Management
###############################################################################

.PHONY: workflow-add
workflow-add: ## Create new workflow: make workflow-add NAME="my-workflow"
	@[ -n "$(NAME)" ] || (echo "ERROR: NAME required. Usage: make workflow-add NAME=\"my-workflow\"" && exit 1)
	$(VM_SSH) "cd $(PROJECT_DIR) && bash scripts/n8n-ctl.sh create '$(NAME)'"
	$(VM_SSH) "cd $(PROJECT_DIR) && bash scripts/sync-workflows.sh export"

.PHONY: workflow-update
workflow-update: ## Push local JSON changes: make workflow-update NAME="my-workflow"
	@[ -n "$(NAME)" ] || (echo "ERROR: NAME required" && exit 1)
	$(VM_SSH) "cd $(PROJECT_DIR) && bash scripts/n8n-ctl.sh update '$(NAME)'"

.PHONY: workflow-delete
workflow-delete: ## Delete workflow: make workflow-delete NAME="my-workflow"
	@[ -n "$(NAME)" ] || (echo "ERROR: NAME required" && exit 1)
	$(VM_SSH) "cd $(PROJECT_DIR) && bash scripts/n8n-ctl.sh delete '$(NAME)'"

.PHONY: workflow-disable
workflow-disable: ## Deactivate workflow: make workflow-disable NAME="my-workflow"
	@[ -n "$(NAME)" ] || (echo "ERROR: NAME required" && exit 1)
	$(VM_SSH) "cd $(PROJECT_DIR) && bash scripts/n8n-ctl.sh disable '$(NAME)'"

.PHONY: workflow-enable
workflow-enable: ## Activate workflow: make workflow-enable NAME="my-workflow"
	@[ -n "$(NAME)" ] || (echo "ERROR: NAME required" && exit 1)
	$(VM_SSH) "cd $(PROJECT_DIR) && bash scripts/n8n-ctl.sh enable '$(NAME)'"

.PHONY: workflow-trigger
workflow-trigger: ## Manually execute: make workflow-trigger NAME="my-workflow"
	@[ -n "$(NAME)" ] || (echo "ERROR: NAME required" && exit 1)
	$(VM_SSH) "cd $(PROJECT_DIR) && bash scripts/n8n-ctl.sh trigger '$(NAME)'"

.PHONY: workflow-list
workflow-list: ## List all workflows with status
	$(VM_SSH) "cd $(PROJECT_DIR) && bash scripts/n8n-ctl.sh list"

.PHONY: workflows-export
workflows-export: ## Sync all workflows from n8n to disk
	$(VM_SSH) "cd $(PROJECT_DIR) && bash scripts/sync-workflows.sh export"

.PHONY: workflows-import
workflows-import: ## Sync all workflows from disk to n8n
	$(VM_SSH) "cd $(PROJECT_DIR) && bash scripts/sync-workflows.sh import"

###############################################################################
# Debugging / Logs
###############################################################################

.PHONY: logs
logs: ## Tail container logs: make logs [SERVICE=n8n]
	@if [ -n "$(SERVICE)" ]; then \
		$(VM_SSH) "cd $(PROJECT_DIR) && docker compose logs -f --tail=100 $(SERVICE)"; \
	else \
		$(VM_SSH) "cd $(PROJECT_DIR) && docker compose logs -f --tail=50"; \
	fi

.PHONY: workflow-logs
workflow-logs: ## Fetch recent executions: make workflow-logs NAME="my-workflow"
	@[ -n "$(NAME)" ] || (echo "ERROR: NAME required" && exit 1)
	$(VM_SSH) "cd $(PROJECT_DIR) && bash scripts/n8n-ctl.sh executions '$(NAME)'"

.PHONY: workflow-debug
workflow-debug: ## Show last execution with error details: make workflow-debug NAME="my-workflow"
	@[ -n "$(NAME)" ] || (echo "ERROR: NAME required" && exit 1)
	$(VM_SSH) "cd $(PROJECT_DIR) && bash scripts/n8n-ctl.sh debug '$(NAME)'"

.PHONY: health
health: ## Run health checks across all services
	$(VM_SSH) "cd $(PROJECT_DIR) && bash scripts/health-check.sh"

.PHONY: debug-workflow
debug-workflow: workflow-debug ## Alias for workflow-debug

###############################################################################
# Secrets (Vault)
###############################################################################

.PHONY: vault-ui
vault-ui: ## Open Vault UI in browser
	@open "http://localhost:$(VAULT_PORT)/ui" 2>/dev/null || \
		echo "Vault UI: http://localhost:$(VAULT_PORT)/ui"

.PHONY: vault-set
vault-set: ## Write secret: make vault-set KEY=name VALUE=secret
	@[ -n "$(KEY)" ] && [ -n "$(VALUE)" ] || (echo "ERROR: KEY and VALUE required" && exit 1)
	@jq -n --arg v "$(VALUE)" '{"data": {"value": $$v}}' | \
		curl -s -X POST \
		-H "X-Vault-Token: $(VAULT_ROOT_TOKEN)" \
		-H "Content-Type: application/json" \
		-d @- \
		"http://localhost:$(VAULT_PORT)/v1/secret/data/n8n/$(KEY)" | jq .

.PHONY: vault-get
vault-get: ## Read secret: make vault-get KEY=name
	@[ -n "$(KEY)" ] || (echo "ERROR: KEY required" && exit 1)
	@curl -s \
		-H "X-Vault-Token: $(VAULT_ROOT_TOKEN)" \
		"http://localhost:$(VAULT_PORT)/v1/secret/data/n8n/$(KEY)" | jq '.data.data'

.PHONY: vault-list
vault-list: ## List all n8n secrets in Vault
	@curl -s \
		-H "X-Vault-Token: $(VAULT_ROOT_TOKEN)" \
		"http://localhost:$(VAULT_PORT)/v1/secret/metadata/n8n?list=true" | jq '.data.keys'

.PHONY: vault-seed
vault-seed: ## Write OpenClaw API key and other agent secrets to Vault
	@echo "Seeding Vault with agent secrets..."
	@jq -n --arg k "$(OPENCLAW_API_KEY)" '{"data": {"api_key": $$k}}' | \
		curl -s -X POST \
		-H "X-Vault-Token: $(VAULT_ROOT_TOKEN)" \
		-H "Content-Type: application/json" \
		-d @- \
		"http://localhost:$(VAULT_PORT)/v1/secret/data/n8n/openclaw" | jq '.data.version // "seeded"'
	@jq -n --arg k "$(N8N_API_KEY)" '{"data": {"api_key": $$k}}' | \
		curl -s -X POST \
		-H "X-Vault-Token: $(VAULT_ROOT_TOKEN)" \
		-H "Content-Type: application/json" \
		-d @- \
		"http://localhost:$(VAULT_PORT)/v1/secret/data/n8n/n8n_api" | jq '.data.version // "seeded"'
	@echo "Vault seeded."

###############################################################################
# Infrastructure (Terraform)
###############################################################################

.PHONY: tf-init
tf-init: ## Initialize Terraform
	@source scripts/env-to-tfvars.sh && cd terraform && terraform init

.PHONY: tf-plan
tf-plan: ## Preview infrastructure changes
	@source scripts/env-to-tfvars.sh && cd terraform && terraform plan

.PHONY: tf-apply
tf-apply: ## Apply infrastructure changes
	@source scripts/env-to-tfvars.sh && cd terraform && terraform apply -auto-approve
	@# Extract Cloudflare tunnel token if Terraform manages the tunnel
	@tunnel_token=$$(cd terraform && terraform output -raw cloudflare_tunnel_token 2>/dev/null) && \
		if [ -n "$$tunnel_token" ]; then \
			if grep -q '^CLOUDFLARE_TUNNEL_TOKEN=' .env 2>/dev/null; then \
				sed -i '' "s|^CLOUDFLARE_TUNNEL_TOKEN=.*|CLOUDFLARE_TUNNEL_TOKEN=$$tunnel_token|" .env; \
			else \
				echo "CLOUDFLARE_TUNNEL_TOKEN=$$tunnel_token" >> .env; \
			fi; \
			echo "  Updated CLOUDFLARE_TUNNEL_TOKEN in .env from Terraform output"; \
		fi || true

.PHONY: tf-destroy
tf-destroy: ## Tear down managed infrastructure
	@source scripts/env-to-tfvars.sh && cd terraform && terraform destroy

###############################################################################
# Backup
###############################################################################

.PHONY: backup
backup: ## PostgreSQL database backup
	$(VM_SSH) "cd $(PROJECT_DIR) && bash scripts/backup.sh backup"

.PHONY: restore
restore: ## Restore from backup: make restore BACKUP=path
	@[ -n "$(BACKUP)" ] || (echo "ERROR: BACKUP path required" && exit 1)
	$(VM_SSH) "cd $(PROJECT_DIR) && bash scripts/backup.sh restore '$(BACKUP)'"

###############################################################################
# Observability
###############################################################################

.PHONY: logs-query
logs-query: ## Query Grafana Cloud Loki: make logs-query QUERY='{container_name="n8n"}' START=1h
	@[ -n "$(QUERY)" ] || (echo "ERROR: QUERY required" && exit 1)
	@START=$${START:-1h}; \
	curl -s -G \
		-u "$(GRAFANA_CLOUD_USER):$(GRAFANA_CLOUD_API_KEY)" \
		--data-urlencode "query=$(QUERY)" \
		--data-urlencode "start=$$(date -u -v-$${START} +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d "$${START} ago" +%Y-%m-%dT%H:%M:%SZ)" \
		"$(GRAFANA_CLOUD_LOKI_URL)/loki/api/v1/query_range" | jq '.data.result'

.PHONY: metrics-query
metrics-query: ## Query Grafana Cloud Prometheus: make metrics-query QUERY='n8n_workflow_execution_total'
	@[ -n "$(QUERY)" ] || (echo "ERROR: QUERY required" && exit 1)
	@curl -s -G \
		-u "$(GRAFANA_CLOUD_USER):$(GRAFANA_CLOUD_API_KEY)" \
		--data-urlencode "query=$(QUERY)" \
		"$(GRAFANA_CLOUD_PROMETHEUS_URL)/api/v1/query" | jq '.data.result'

.PHONY: grafana
grafana: ## Open Grafana Cloud in browser
	@open "$(GRAFANA_CLOUD_STACK_URL)" 2>/dev/null || \
		echo "Grafana Cloud: $(GRAFANA_CLOUD_STACK_URL)"

.PHONY: alerts
alerts: ## Show currently firing alerts from Grafana Cloud
	@curl -s \
		-u "$(GRAFANA_CLOUD_USER):$(GRAFANA_CLOUD_API_KEY)" \
		"$(GRAFANA_CLOUD_STACK_URL)/api/alertmanager/grafana/api/v2/alerts" | \
		jq '[.[] | select(.status.state == "active")]'

.PHONY: dashboards-push
dashboards-push: ## Push versioned dashboard JSON to Grafana Cloud
	bash config/grafana-cloud/provisioner.sh dashboards

.PHONY: alerts-push
alerts-push: ## Push versioned alert rules to Grafana Cloud
	bash config/grafana-cloud/provisioner.sh alerts

###############################################################################
# AI Agent
###############################################################################

.PHONY: agent
agent: ## Send a message to OpenClaw: make agent MSG="What workflows are running?"
	@[ -n "$(MSG)" ] || (echo "ERROR: MSG required. Usage: make agent MSG=\"...\"" && exit 1)
	$(VM_SSH) "openclaw chat '$(MSG)'"

###############################################################################
# Internal Targets (called by other targets)
###############################################################################

.PHONY: setup-noninteractive
setup-noninteractive: ## Internal: docker compose up + vault seed + openclaw setup
	@echo "Running non-interactive setup inside VM..."
	$(VM_SSH) "cd $(PROJECT_DIR) && docker compose up -d"
	@echo "Waiting for Vault to be ready..."
	@for i in $$(seq 1 30); do \
		$(VM_SSH) "curl -s http://localhost:$(VAULT_PORT)/v1/sys/seal-status" 2>/dev/null | grep -q '"sealed":false' && break || sleep 2; \
	done
	@echo "Vault ready. Seeding secrets..."
	@$(MAKE) vault-seed
	@echo "Running OpenClaw setup..."
	$(VM_SSH) "cd $(PROJECT_DIR) && bash scripts/openclaw-setup.sh" || true
	@# Push dashboards/alerts only if Grafana Cloud is configured
	@if [ -n "$(GRAFANA_CLOUD_STACK_URL)" ]; then \
		echo "Pushing Grafana dashboards and alerts..."; \
		bash config/grafana-cloud/provisioner.sh all || echo "WARN: Grafana provisioning failed (non-blocking)"; \
	else \
		echo "Skipping Grafana provisioning (GRAFANA_CLOUD_STACK_URL not set)"; \
	fi
	@echo "Running health check..."
	$(VM_SSH) "cd $(PROJECT_DIR) && bash scripts/health-check.sh" || true

###############################################################################
# Help
###############################################################################

.PHONY: help
help: ## Show this help message
	@echo "AI-Native n8n Automation System"
	@echo ""
	@echo "Usage: make <target> [OPTIONS]"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-25s\033[0m %s\n", $$1, $$2}' | \
		sort
