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
VM_USER       ?= parallels
VM_PASSWORD   ?= parallels
VM_SSH_PORT   ?= 2222
VM_NAME       ?= n8n-ai-worker
VM_TEMPLATE   ?= Ubuntu 24.04 (with Rosetta)
VM_CPU        ?= 4
VM_MEMORY     ?= 8192
VM_SSH        := ssh -o StrictHostKeyChecking=no -p $(VM_SSH_PORT) $(VM_USER)@localhost
VM_SCP        := scp -o StrictHostKeyChecking=no -P $(VM_SSH_PORT)
HOST_IP       ?= 10.211.55.2
N8N_PORT      ?= 5678
VAULT_PORT    ?= 8200
OPENCLAW_PORT ?= 18789
TZ            ?= UTC

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

.PHONY: sudo-cache
sudo-cache: ## Cache sudo credentials (needed for Parallels DevOps service install)
	@echo "Caching sudo credentials (needed for Parallels DevOps setup)..."
	@sudo -v

PRLDEVOPS_VERSION ?= latest
.PHONY: ensure-prldevops
ensure-prldevops: ## Ensure prldevops binary is installed in ~/bin
	@if command -v prldevops >/dev/null 2>&1 || [ -x "$$HOME/bin/prldevops" ]; then \
		echo "prldevops found: $$($$HOME/bin/prldevops version 2>/dev/null || prldevops version)"; \
	else \
		echo "prldevops not found — installing to ~/bin..."; \
		mkdir -p "$$HOME/bin"; \
		ARCH=$$(uname -m); \
		if [ "$$ARCH" = "x86_64" ]; then ARCH="amd64"; fi; \
		if [ "$(PRLDEVOPS_VERSION)" = "latest" ]; then \
			TAG=$$(curl -sI https://github.com/Parallels/prl-devops-service/releases/latest | grep -i '^location:' | sed 's|.*/tag/||;s/[[:space:]]*$$//'); \
		else \
			TAG="v$(PRLDEVOPS_VERSION)"; \
		fi; \
		URL="https://github.com/Parallels/prl-devops-service/releases/download/$$TAG/prldevops--darwin-$$ARCH.tar.gz"; \
		echo "  Downloading $$URL ..."; \
		curl -fsSL "$$URL" -o /tmp/prldevops.tar.gz && \
		tar -xzf /tmp/prldevops.tar.gz -C "$$HOME/bin" && \
		chmod +x "$$HOME/bin/prldevops" && \
		rm -f /tmp/prldevops.tar.gz && \
		echo "  Installed prldevops $$($$HOME/bin/prldevops version) to ~/bin"; \
	fi

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
# Lifecycle (Host Docker + VM OpenClaw)
###############################################################################

.PHONY: up
up: check-env sudo-cache ensure-prldevops tf-init docker-up vm-create vm-ports tf-apply vm-setup-openclaw health ## Full bootstrap: start stack on host + OpenClaw in VM (Ansible provisions VM during tf-apply)
	@echo ""
	@echo "=== System is UP ==="
	@echo "n8n:      http://localhost:$(N8N_PORT)"
	@echo "Vault:    http://localhost:$(VAULT_PORT)"
	@echo "OpenClaw: http://localhost:$(OPENCLAW_PORT) (via VM)"
	@echo "VM SSH:   ssh -p $(VM_SSH_PORT) $(VM_USER)@localhost"

.PHONY: docker-up
docker-up: ## Start Docker stack on host + seed Vault
	@echo "=== Starting Docker stack on host ==="
	@mkdir -p data/n8n data/postgres data/vault data/redis data/openclaw-logs
	docker compose up -d
	@echo "Waiting for Vault to be ready..."
	@for i in $$(seq 1 30); do \
		curl -s "http://localhost:$(VAULT_PORT)/v1/sys/seal-status" 2>/dev/null | grep -q '"sealed":false' && break || sleep 2; \
	done
	@echo "Vault ready. Seeding secrets..."
	@$(MAKE) vault-seed
	@echo "Docker stack running."
	@$(MAKE) sync-logs

.PHONY: start
start: ## Start Docker stack + VM (no Terraform)
	@echo "Starting Docker stack..."
	docker compose up -d
	@echo "Starting VM..."
	prlctl start "$(VM_NAME)" 2>/dev/null || true
	@echo "Started."
	@$(MAKE) sync-logs

.PHONY: stop
stop: ## Stop Docker stack + suspend VM
	@echo "Stopping Docker stack..."
	docker compose stop
	@echo "Suspending VM..."
	prlctl suspend "$(VM_NAME)" 2>/dev/null || true
	@echo "Stopped."

.PHONY: down
down: ## Stop Docker stack gracefully (VM stays running)
	@echo "Stopping Docker stack..."
	docker compose down

.PHONY: destroy
destroy: sudo-cache ## Full teardown: stop stack + destroy VM + Terraform resources
	@echo "WARNING: This will destroy the Docker stack, VM, and all Terraform-managed resources."
	@read -p "Are you sure? (y/N) " confirm && [ "$$confirm" = "y" ] || exit 1
	docker compose down --volumes 2>/dev/null || true
	@$(MAKE) vm-destroy || true
	@source scripts/env-to-tfvars.sh && cd terraform && terraform destroy -auto-approve
	@echo "Destroyed."

.PHONY: clean-devops
clean-devops: sudo-cache ## Manual cleanup of prldevops service & binary (use if terraform destroy fails)
	@echo "Stopping prldevops service..."
	@if command -v prldevops >/dev/null 2>&1; then \
		sudo prldevops uninstall service 2>/dev/null || true; \
	fi
	@echo "Removing prldevops binary..."
	@rm -f ~/bin/prldevops 2>/dev/null || true
	@sudo rm -f /usr/local/bin/prldevops 2>/dev/null || true
	@rm -f ~/.parallels-devops-service.json 2>/dev/null || true
	@echo "prldevops cleaned up."

.PHONY: restart
restart: ## Restart Docker stack on host
	docker compose restart

.PHONY: status
status: ## Show VM state, container health, n8n version, Vault seal status
	@echo "=== Container Status ==="
	@docker compose ps 2>/dev/null || echo "Docker stack not running"
	@echo ""
	@echo "=== VM Status ==="
	@prlctl status "$(VM_NAME)" 2>/dev/null || echo "VM not found"
	@echo ""
	@echo "=== n8n Health ==="
	@curl -s "http://localhost:$(N8N_PORT)/healthz" 2>/dev/null || echo "n8n unreachable"
	@echo ""
	@echo "=== Vault Status ==="
	@curl -s "http://localhost:$(VAULT_PORT)/v1/sys/seal-status" 2>/dev/null | jq '{sealed, version}' || echo "Vault unreachable"

###############################################################################
# VM Management (via prlctl -- no Terraform dependency)
###############################################################################

# Helper: get VM IP address via prlctl exec
VM_IP_CMD = prlctl exec "$(VM_NAME)" "ip -4 addr show enp0s5" 2>/dev/null | grep inet | awk '{print $$2}' | cut -d/ -f1

.PHONY: vm-create
vm-create: ## Create VM by cloning template (or skip if already exists)
	@if prlctl status "$(VM_NAME)" >/dev/null 2>&1; then \
		echo "VM '$(VM_NAME)' already exists. Starting if stopped..."; \
		prlctl start "$(VM_NAME)" 2>/dev/null || true; \
	else \
		echo "=== Creating VM '$(VM_NAME)' from template '$(VM_TEMPLATE)' ==="; \
		if prlctl list -a 2>/dev/null | grep -q "$(VM_TEMPLATE)"; then \
			echo "Ensuring template is stopped before cloning..."; \
			TMPL_STATUS=$$(prlctl status "$(VM_TEMPLATE)" 2>/dev/null | awk '{print $$NF}'); \
			if [ "$$TMPL_STATUS" = "suspended" ]; then \
				prlctl resume "$(VM_TEMPLATE)" && sleep 5; \
			fi; \
			if [ "$$TMPL_STATUS" != "stopped" ]; then \
				prlctl stop "$(VM_TEMPLATE)" 2>/dev/null || true; \
			fi; \
			echo "Cloning template..."; \
			prlctl clone "$(VM_TEMPLATE)" --name "$(VM_NAME)"; \
		else \
			echo "ERROR: Template '$(VM_TEMPLATE)' not found."; \
			echo "Please install it from Parallels Desktop: File > New > Download Ubuntu 24.04 (with Rosetta)"; \
			exit 1; \
		fi; \
		echo "Configuring VM specs..."; \
		prlctl set "$(VM_NAME)" --cpus $(VM_CPU) --memsize $(VM_MEMORY); \
		prlctl set "$(VM_NAME)" --rosetta-linux on 2>/dev/null || true; \
		prlctl set "$(VM_NAME)" --startup-view headless; \
		prlctl set "$(VM_NAME)" --on-window-close keep-running 2>/dev/null || true; \
		prlctl set "$(VM_NAME)" --autostart start-host 2>/dev/null || true; \
		echo "Starting VM..."; \
		prlctl start "$(VM_NAME)"; \
	fi
	@echo "Waiting for VM to get an IP..."
	@for i in $$(seq 1 60); do \
		IP=$$($(VM_IP_CMD)); \
		if [ -n "$$IP" ]; then \
			echo "VM IP: $$IP"; \
			break; \
		fi; \
		sleep 2; \
	done
	@echo "Waiting for SSH to be ready..."
	@for i in $$(seq 1 30); do \
		prlctl exec "$(VM_NAME)" "echo SSH ready" 2>/dev/null && break || sleep 2; \
	done
	@echo "Setting up SSH key auth..."
	@SSH_KEY=$$(cat $$HOME/.ssh/id_ed25519.pub 2>/dev/null || cat $$HOME/.ssh/id_rsa.pub 2>/dev/null); \
	if [ -n "$$SSH_KEY" ]; then \
		prlctl exec "$(VM_NAME)" "mkdir -p /home/$(VM_USER)/.ssh && grep -qF '$$SSH_KEY' /home/$(VM_USER)/.ssh/authorized_keys 2>/dev/null || echo '$$SSH_KEY' >> /home/$(VM_USER)/.ssh/authorized_keys && chmod 700 /home/$(VM_USER)/.ssh && chmod 600 /home/$(VM_USER)/.ssh/authorized_keys"; \
		echo "SSH key installed."; \
	else \
		echo "WARN: No SSH public key found (~/.ssh/id_ed25519.pub or id_rsa.pub). You'll need to set up SSH auth manually."; \
	fi
	@echo "Configuring passwordless sudo..."
	@prlctl exec "$(VM_NAME)" "echo '$(VM_USER) ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/$(VM_USER) && chmod 440 /etc/sudoers.d/$(VM_USER)"
	@echo "Setting user password..."
	@prlctl exec "$(VM_NAME)" "echo '$(VM_USER):$(VM_PASSWORD)' | chpasswd"
	@echo "VM '$(VM_NAME)' is running."

.PHONY: vm-ports
vm-ports: ## Set up NAT port forwarding (SSH + OpenClaw + node-exporter)
	@echo "=== Setting up port forwarding ==="
	@VM_IP=$$($(VM_IP_CMD)); \
	if [ -z "$$VM_IP" ]; then \
		echo "ERROR: Could not get VM IP. Is the VM running?"; \
		exit 1; \
	fi; \
	echo "VM IP: $$VM_IP"; \
	echo "  Forwarding localhost:$(VM_SSH_PORT) -> $$VM_IP:22 (SSH)"; \
	prlsrvctl net set Shared --nat-tcp-add n8n-ssh,$(VM_SSH_PORT),$$VM_IP,22 2>/dev/null || \
		(prlsrvctl net set Shared --nat-tcp-del n8n-ssh 2>/dev/null; \
		 prlsrvctl net set Shared --nat-tcp-add n8n-ssh,$(VM_SSH_PORT),$$VM_IP,22); \
	echo "  Forwarding localhost:$(OPENCLAW_PORT) -> $$VM_IP:$(OPENCLAW_PORT) (OpenClaw)"; \
	prlsrvctl net set Shared --nat-tcp-add n8n-openclaw,$(OPENCLAW_PORT),$$VM_IP,$(OPENCLAW_PORT) 2>/dev/null || \
		(prlsrvctl net set Shared --nat-tcp-del n8n-openclaw 2>/dev/null; \
		 prlsrvctl net set Shared --nat-tcp-add n8n-openclaw,$(OPENCLAW_PORT),$$VM_IP,$(OPENCLAW_PORT)); \
	echo "  Forwarding localhost:9100 -> $$VM_IP:9100 (node-exporter)"; \
	prlsrvctl net set Shared --nat-tcp-add n8n-node-exporter,9100,$$VM_IP,9100 2>/dev/null || \
		(prlsrvctl net set Shared --nat-tcp-del n8n-node-exporter 2>/dev/null; \
		 prlsrvctl net set Shared --nat-tcp-add n8n-node-exporter,9100,$$VM_IP,9100); \
	echo "Port forwarding configured (SSH + OpenClaw + node-exporter)."

.PHONY: vm-provision-openclaw
vm-provision-openclaw: ## Provision VM: install only Node.js + OpenClaw + basic tools
	@echo "=== Provisioning VM (OpenClaw only) ==="
	@echo "Waiting for any background apt to finish..."
	@$(VM_SSH) 'while sudo fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do echo "  apt lock held, waiting..."; sleep 5; done'
	@echo "Installing Node.js + OpenClaw..."
	$(VM_SSH) 'set -euo pipefail && export DEBIAN_FRONTEND=noninteractive && \
		sudo apt-get update && \
		sudo apt-get install -y jq curl && \
		curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && \
		sudo apt-get install -y nodejs && \
		sudo npm install -g openclaw@latest && \
		echo "Provisioning complete: $$(openclaw --version 2>/dev/null || echo openclaw installed)"'

.PHONY: vm-setup-openclaw
vm-setup-openclaw: ## Configure and start OpenClaw in the VM
	@echo "=== Setting up OpenClaw in VM ==="
	@echo "Copying OpenClaw setup script to VM..."
	$(VM_SCP) scripts/openclaw-setup.sh $(VM_USER)@localhost:/tmp/openclaw-setup.sh
	@if [ -d openclaw/workspace ]; then \
		echo "Syncing OpenClaw workspace files to VM..."; \
		$(VM_SSH) "sudo mkdir -p /home/openclaw/.openclaw/workspace/skills /home/openclaw/.openclaw/logs && sudo chown -R openclaw:openclaw /home/openclaw/.openclaw"; \
		rsync -avz --progress \
			-e "ssh -o StrictHostKeyChecking=no -p $(VM_SSH_PORT)" \
			openclaw/workspace/ $(VM_USER)@localhost:/tmp/openclaw-workspace/; \
		$(VM_SSH) "sudo cp -r /tmp/openclaw-workspace/. /home/openclaw/.openclaw/workspace/ && sudo chown -R openclaw:openclaw /home/openclaw/.openclaw/workspace"; \
	fi
	@echo "Running OpenClaw setup in VM (as openclaw user)..."
	$(VM_SSH) "sudo -H -u openclaw env HOST_IP=$(HOST_IP) N8N_PORT=$(N8N_PORT) OPENCLAW_PORT=$(OPENCLAW_PORT) OPENCLAW_API_KEY=$(OPENCLAW_API_KEY) VAULT_ROOT_TOKEN=$(VAULT_ROOT_TOKEN) VAULT_PORT=$(VAULT_PORT) N8N_API_KEY=$(N8N_API_KEY) TELEGRAM_BOT_TOKEN=$(TELEGRAM_BOT_TOKEN) PATH=/home/openclaw/.local/bin:/home/openclaw/.local/share/pnpm:$$PATH HOME=/home/openclaw bash /tmp/openclaw-setup.sh"
	@echo "OpenClaw setup complete."

.PHONY: vm-destroy
vm-destroy: ## Destroy VM and remove port forwarding
	@echo "=== Destroying VM '$(VM_NAME)' ==="
	@echo "Stopping OpenClaw in VM (if reachable)..."
	@$(VM_SSH) "openclaw gateway stop" 2>/dev/null || true
	@echo "Removing port forwarding rules..."
	@prlsrvctl net set Shared --nat-tcp-del n8n-ssh 2>/dev/null || true
	@prlsrvctl net set Shared --nat-tcp-del n8n-openclaw 2>/dev/null || true
	@# Clean up legacy rules from previous architecture
	@prlsrvctl net set Shared --nat-tcp-del n8n-web 2>/dev/null || true
	@prlsrvctl net set Shared --nat-tcp-del n8n-vault 2>/dev/null || true
	@echo "Stopping VM..."
	@prlctl stop "$(VM_NAME)" --kill 2>/dev/null || true
	@echo "Deleting VM..."
	@prlctl delete "$(VM_NAME)" 2>/dev/null || true
	@echo "VM destroyed."

.PHONY: vm-ssh
vm-ssh: ## SSH into the VM
	$(VM_SSH)

.PHONY: vm-status
vm-status: ## Show VM status
	@prlctl status "$(VM_NAME)" 2>/dev/null || echo "VM '$(VM_NAME)' not found"
	@echo ""
	@VM_IP=$$($(VM_IP_CMD)); \
	if [ -n "$$VM_IP" ]; then echo "VM IP: $$VM_IP"; else echo "VM IP: unavailable"; fi

###############################################################################
# Workflow Management (runs locally -- n8n is on the host)
###############################################################################

.PHONY: workflow-generate
workflow-generate: ## AI-generate workflow from idea: make workflow-generate IDEA="Send daily Slack digest"
	@[ -n "$(IDEA)" ] || (echo "ERROR: IDEA required. Usage: make workflow-generate IDEA=\"Send daily Slack digest\"" && exit 1)
	python3 scripts/generate-workflow.py --deploy '$(IDEA)'

.PHONY: workflow-generate-preview
workflow-generate-preview: ## Preview generated workflow without deploying: make workflow-generate-preview IDEA="..."
	@[ -n "$(IDEA)" ] || (echo "ERROR: IDEA required" && exit 1)
	python3 scripts/generate-workflow.py '$(IDEA)'

.PHONY: workflow-add
workflow-add: ## Create new workflow: make workflow-add NAME="my-workflow"
	@[ -n "$(NAME)" ] || (echo "ERROR: NAME required. Usage: make workflow-add NAME=\"my-workflow\"" && exit 1)
	bash scripts/n8n-ctl.sh create '$(NAME)'
	bash scripts/sync-workflows.sh export

.PHONY: workflow-update
workflow-update: ## Push local JSON changes: make workflow-update NAME="my-workflow"
	@[ -n "$(NAME)" ] || (echo "ERROR: NAME required" && exit 1)
	bash scripts/n8n-ctl.sh update '$(NAME)'

.PHONY: workflow-delete
workflow-delete: ## Delete workflow: make workflow-delete NAME="my-workflow"
	@[ -n "$(NAME)" ] || (echo "ERROR: NAME required" && exit 1)
	bash scripts/n8n-ctl.sh delete '$(NAME)'

.PHONY: workflow-disable
workflow-disable: ## Deactivate workflow: make workflow-disable NAME="my-workflow"
	@[ -n "$(NAME)" ] || (echo "ERROR: NAME required" && exit 1)
	bash scripts/n8n-ctl.sh disable '$(NAME)'

.PHONY: workflow-enable
workflow-enable: ## Activate workflow: make workflow-enable NAME="my-workflow"
	@[ -n "$(NAME)" ] || (echo "ERROR: NAME required" && exit 1)
	bash scripts/n8n-ctl.sh enable '$(NAME)'

.PHONY: workflow-trigger
workflow-trigger: ## Manually execute: make workflow-trigger NAME="my-workflow"
	@[ -n "$(NAME)" ] || (echo "ERROR: NAME required" && exit 1)
	bash scripts/n8n-ctl.sh trigger '$(NAME)'

.PHONY: workflow-list
workflow-list: ## List all workflows with status
	bash scripts/n8n-ctl.sh list

.PHONY: workflows-export
workflows-export: ## Sync all workflows from n8n to disk
	bash scripts/sync-workflows.sh export

.PHONY: workflows-import
workflows-import: ## Sync all workflows from disk to n8n
	bash scripts/sync-workflows.sh import

###############################################################################
# Debugging / Logs (runs locally -- Docker is on the host)
###############################################################################

.PHONY: logs
logs: ## Tail container logs: make logs [SERVICE=n8n]
	@if [ -n "$(SERVICE)" ]; then \
		docker compose logs -f --tail=100 $(SERVICE); \
	else \
		docker compose logs -f --tail=50; \
	fi

.PHONY: workflow-logs
workflow-logs: ## Fetch recent executions: make workflow-logs NAME="my-workflow"
	@[ -n "$(NAME)" ] || (echo "ERROR: NAME required" && exit 1)
	bash scripts/n8n-ctl.sh executions '$(NAME)'

.PHONY: workflow-debug
workflow-debug: ## Show last execution with error details: make workflow-debug NAME="my-workflow"
	@[ -n "$(NAME)" ] || (echo "ERROR: NAME required" && exit 1)
	bash scripts/n8n-ctl.sh debug '$(NAME)'

.PHONY: health
health: ## Run health checks across all services
	bash scripts/health-check.sh

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
	bash scripts/backup.sh backup

.PHONY: restore
restore: ## Restore from backup: make restore BACKUP=path
	@[ -n "$(BACKUP)" ] || (echo "ERROR: BACKUP path required" && exit 1)
	bash scripts/backup.sh restore '$(BACKUP)'

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
# AI Agent (runs in VM)
###############################################################################

.PHONY: agent
agent: ## Send a message to OpenClaw: make agent MSG="What workflows are running?"
	@[ -n "$(MSG)" ] || (echo "ERROR: MSG required. Usage: make agent MSG=\"...\"" && exit 1)
	$(VM_SSH) "openclaw chat '$(MSG)'"

.PHONY: agent-status
agent-status: ## Check OpenClaw status in VM
	$(VM_SSH) "openclaw status" 2>/dev/null || echo "OpenClaw unreachable in VM"

.PHONY: sync-logs
sync-logs: ## Start OpenClaw log sync from VM in background (feeds Grafana Alloy)
	@mkdir -p data/openclaw-logs
	@# Kill any existing sync process
	@pkill -f "sync-openclaw-logs.sh" 2>/dev/null || true
	@sleep 1
	@echo "Starting OpenClaw log sync in background..."
	@nohup bash scripts/sync-openclaw-logs.sh > /tmp/sync-openclaw-logs.log 2>&1 &
	@echo "  Log sync started (PID: $$!). Logs: /tmp/sync-openclaw-logs.log"

.PHONY: sync-logs-stop
sync-logs-stop: ## Stop the background OpenClaw log sync
	@pkill -f "sync-openclaw-logs.sh" 2>/dev/null && echo "Log sync stopped." || echo "Log sync not running."

# =============================================================================
# Cloudflare Tunnel (native macOS process, not Docker)
# Runs on the host so localhost:18789 reaches the Parallels NAT-forwarded
# OpenClaw gateway, and localhost:5678 reaches n8n's published port.
# =============================================================================

.PHONY: cloudflared-start
cloudflared-start: ## Start cloudflared tunnel as background process on macOS host
	@[ -n "$(CLOUDFLARE_TUNNEL_TOKEN)" ] || { echo "CLOUDFLARE_TUNNEL_TOKEN not set, skipping cloudflared"; exit 0; }
	@command -v cloudflared >/dev/null 2>&1 || { echo "cloudflared not installed. Run: brew install cloudflared"; exit 0; }
	@pkill -f "cloudflared tunnel run" 2>/dev/null || true
	@sleep 1
	@echo "Starting cloudflared tunnel on macOS host..."
	@TUNNEL_TOKEN="$(CLOUDFLARE_TUNNEL_TOKEN)" nohup cloudflared tunnel run --token "$(CLOUDFLARE_TUNNEL_TOKEN)" \
		> /tmp/cloudflared.log 2>&1 &
	@echo "  cloudflared started (PID: $$!). Logs: /tmp/cloudflared.log"

.PHONY: cloudflared-stop
cloudflared-stop: ## Stop the background cloudflared process
	@pkill -f "cloudflared tunnel run" 2>/dev/null && echo "cloudflared stopped." || echo "cloudflared not running."

###############################################################################
# Internal Targets (called by other targets)
###############################################################################

# (docker-up, vm-provision-openclaw, vm-setup-openclaw are defined above)

###############################################################################
# Website Factory
###############################################################################

.PHONY: wf-setup
wf-setup: ## Initialize Website Factory (data dir + copy scripts to n8n)
	@echo "=== Setting up Website Factory ==="
	@mkdir -p data/n8n/website-factory
	@cp projects/website-factory/scripts/generate-site.sh data/n8n/website-factory/generate-site.sh
	@chmod +x data/n8n/website-factory/generate-site.sh
	@cp projects/website-factory/db/schema.sql data/n8n/website-factory/schema.sql
	@echo "Website Factory setup complete. Projects stored in data/n8n/website-factory/projects.json"

.PHONY: wf-push-template
wf-push-template: ## Push base template to GitHub (GITHUB_OWNER/website-factory-base)
	@echo "=== Pushing Website Factory base template to GitHub ==="
	@owner="$${GITHUB_OWNER:-tech-sumit}"; \
	cd projects/website-factory/base-template && \
		git init -q 2>/dev/null || true && \
		git remote remove origin 2>/dev/null || true; \
		git remote add origin "https://github.com/$$owner/website-factory-base.git" && \
		git add -A && git status --short
	@echo "Then: cd projects/website-factory/base-template && git commit -m 'Base template' && git push -u origin main"

.PHONY: wf-import
wf-import: ## Import Website Factory workflow into n8n
	@echo "Importing Website Factory workflow..."
	@bash scripts/n8n-ctl.sh create "Website Factory Pipeline" projects/website-factory/workflow.json
	@echo "Workflow imported. Activate via: make workflow-enable NAME=\"Website Factory Pipeline\""

.PHONY: wf-run
wf-run: ## Run Website Factory job from CLI (JOB=jobs/cafe-peter.json [--dry-run])
	@bash projects/website-factory/scripts/run-job.sh \
		"projects/website-factory/$(JOB)" $(if $(DRY_RUN),--dry-run,)

.PHONY: wf-test
wf-test: ## Open Website Factory form in browser
	@open "http://localhost:$(N8N_PORT)/form/website-factory" 2>/dev/null || \
		echo "Form URL: http://localhost:$(N8N_PORT)/form/website-factory"

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
