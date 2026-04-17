.PHONY: help setup build typecheck test control-plane desktop mobile doctor health

help: ## Show project commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

setup: ## Install workspace dependencies
	npm install

build: ## Build all packages
	npm run build

typecheck: ## Run TypeScript checks
	npm run typecheck

test: ## Run project tests
	npm run test

doctor: ## Validate env + package typechecks
	npm run doctor

control-plane: ## Start the Meshnet-only control plane
	npm run dev:control-plane

desktop: ## Start the Electron desktop app
	npm run dev:desktop

mobile: ## Start the React Native mobile shell
	npm run dev:mobile

health: ## Inspect the control-plane health endpoint
	@bash scripts/health-check.sh
