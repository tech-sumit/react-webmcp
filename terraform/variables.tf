###############################################################################
# Root Terraform Variables
# All values flow from .env via scripts/env-to-tfvars.sh
###############################################################################

# =============================================================================
# Parallels Desktop / VM
# =============================================================================

variable "parallels_license" {
  description = "Parallels Desktop license key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "parallels_password" {
  description = "Root password for prldevops REST API"
  type        = string
  sensitive   = true
}

variable "vm_user" {
  description = "SSH user for the Parallels VM (used by Ansible provisioner)"
  type        = string
  default     = "parallels"
}

variable "vm_ssh_port" {
  description = "NAT-forwarded SSH port for the Parallels VM (used by Ansible provisioner)"
  type        = string
  default     = "2222"
}

# =============================================================================
# Cloudflare
# =============================================================================

variable "cloudflare_api_token" {
  description = "Cloudflare API token with DNS + Tunnel permissions"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
  default     = ""
}

variable "cloudflare_domain" {
  description = "Your domain (e.g., yourdomain.com)"
  type        = string
  default     = ""
}

variable "openclaw_subdomain" {
  description = "Subdomain for OpenClaw gateway (e.g., 'bot-0' for bot-0.panditai.org)"
  type        = string
  default     = "bot-0"
}

variable "vm_ip" {
  description = "IP address of the Parallels VM on the shared network (VM_IP in .env)"
  type        = string
  default     = "10.211.55.10"
}

variable "cloudflare_access_email" {
  description = "Owner email for Cloudflare Access on OpenClaw gateway"
  type        = string
  default     = ""
}

# =============================================================================
# AWS (optional)
# =============================================================================

variable "aws_access_key" {
  description = "AWS access key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "aws_secret_key" {
  description = "AWS secret key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "s3_bucket_prefix" {
  description = "S3 bucket name prefix"
  type        = string
  default     = "n8n-assets"
}

# =============================================================================
# GitHub (optional)
# =============================================================================

variable "github_token" {
  description = "GitHub personal access token"
  type        = string
  sensitive   = true
  default     = ""
}

variable "github_owner" {
  description = "GitHub org or user"
  type        = string
  default     = ""
}

# =============================================================================
# n8n / Project
# =============================================================================

variable "n8n_webhook_url" {
  description = "Public webhook URL"
  type        = string
  default     = ""
}

variable "n8n_port" {
  description = "n8n port"
  type        = string
  default     = "5678"
}

variable "vault_port" {
  description = "Vault API port"
  type        = string
  default     = "8200"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "n8n-ai"
}

