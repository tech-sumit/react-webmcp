#!/bin/bash
###############################################################################
# env-to-tfvars.sh -- Maps .env vars to TF_VAR_ exports
#
# Sourced by Makefile before terraform commands.
# Eliminates the need for a separate terraform.tfvars file.
#
# Usage: source scripts/env-to-tfvars.sh
###############################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: .env file not found at ${ENV_FILE}" >&2
  echo "Copy .env.example to .env and fill in required values." >&2
  return 1 2>/dev/null || exit 1
fi

# Source .env
set -a
source "$ENV_FILE"
set +a

# Map .env vars to Terraform variable names
export TF_VAR_parallels_license="${PARALLELS_LICENSE:-}"
export TF_VAR_parallels_password="${PRLDEVOPS_ROOT_PASSWORD:-}"
export TF_VAR_vm_name="${VM_NAME:-n8n-ai-worker}"
export TF_VAR_vm_cpu="${VM_CPU_COUNT:-4}"
export TF_VAR_vm_memory="${VM_MEMORY_MB:-8192}"
export TF_VAR_vm_ssh_port="${VM_SSH_PORT:-2222}"

# Cloudflare
export TF_VAR_cloudflare_api_token="${CLOUDFLARE_API_TOKEN:-}"
export TF_VAR_cloudflare_account_id="${CLOUDFLARE_ACCOUNT_ID:-}"
export TF_VAR_cloudflare_domain="${CLOUDFLARE_DOMAIN:-}"

# AWS (optional)
export TF_VAR_aws_access_key="${AWS_ACCESS_KEY_ID:-}"
export TF_VAR_aws_secret_key="${AWS_SECRET_ACCESS_KEY:-}"
export TF_VAR_aws_region="${AWS_REGION:-us-east-1}"
export TF_VAR_s3_bucket_prefix="${S3_BUCKET_PREFIX:-n8n-assets}"

# GitHub (optional)
export TF_VAR_github_token="${GITHUB_TOKEN:-}"
export TF_VAR_github_owner="${GITHUB_OWNER:-}"

# n8n
export TF_VAR_n8n_webhook_url="${N8N_WEBHOOK_URL:-}"
export TF_VAR_n8n_port="${N8N_PORT:-5678}"
export TF_VAR_vault_port="${VAULT_PORT:-8200}"

# Project
export TF_VAR_project_name="${PROJECT_NAME:-n8n-ai}"
export TF_VAR_shared_dir="${SHARED_DIR:-./shared}"
