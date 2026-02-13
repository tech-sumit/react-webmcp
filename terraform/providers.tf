###############################################################################
# Terraform Providers
###############################################################################

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    parallels-desktop = {
      source  = "Parallels/parallels-desktop"
      version = ">= 0.7.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
    github = {
      source  = "integrations/github"
      version = ">= 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.0"
    }
  }
}

# Parallels Desktop provider -- uses local DevOps API
provider "parallels-desktop" {
  license = var.parallels_license
}

# Cloudflare provider
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# AWS provider (optional -- only used if S3 module is enabled)
provider "aws" {
  region     = var.aws_region
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key

  # Skip all validation when credentials are not provided
  skip_credentials_validation = true
  skip_requesting_account_id  = true
  skip_metadata_api_check     = true
}

# GitHub provider (optional)
provider "github" {
  token = var.github_token
  owner = var.github_owner
}
