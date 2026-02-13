###############################################################################
# Root Terraform Module -- Composes all sub-modules
###############################################################################

# =============================================================================
# Parallels Desktop VM (always created)
# =============================================================================

module "parallels_vm" {
  source = "./modules/parallels-vm"

  parallels_password = var.parallels_password
  vm_name            = var.vm_name
  vm_cpu             = var.vm_cpu
  vm_memory          = var.vm_memory
  vm_ssh_port        = var.vm_ssh_port
  n8n_port           = var.n8n_port
  vault_port         = var.vault_port
  shared_dir         = var.shared_dir
}

# =============================================================================
# Cloudflare (conditional -- only if API token is provided)
# =============================================================================

module "cloudflare" {
  source = "./modules/cloudflare"
  count  = var.cloudflare_api_token != "" ? 1 : 0

  cloudflare_account_id = var.cloudflare_account_id
  cloudflare_domain     = var.cloudflare_domain
  n8n_webhook_url       = var.n8n_webhook_url
}

# =============================================================================
# S3 (conditional -- only if AWS credentials are provided)
# =============================================================================

module "s3" {
  source = "./modules/s3"
  count  = var.aws_access_key != "" ? 1 : 0

  s3_bucket_prefix = var.s3_bucket_prefix
  aws_region       = var.aws_region
  project_name     = var.project_name
}

# =============================================================================
# GitHub (conditional -- only if GitHub token is provided)
# =============================================================================

module "github" {
  source = "./modules/github"
  count  = var.github_token != "" ? 1 : 0

  github_owner = var.github_owner
  project_name = var.project_name
}
