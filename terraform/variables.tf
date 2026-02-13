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

