# terraform-infra Skill

Terraform infrastructure management. Plan, apply, show, and destroy resources. Manage VM, Cloudflare, S3, and GitHub modules.

## Commands

| Command | Description |
|---------|-------------|
| `make tf-init` | Terraform init |
| `make tf-plan` | Preview infrastructure changes |
| `make tf-apply` | Apply changes (updates CLOUDFLARE_TUNNEL_TOKEN in .env if Cloudflare enabled) |
| `make tf-destroy` | Tear down Terraform-managed resources |
| `terraform show` | Show current state |

## Available Modules

### parallels-vm (always applied)

Provisions the Ubuntu 24.04 VM via prldevops. Includes:
- **ZeroClaw**: AI agent with Rust toolchain
- Rust toolchain for ZeroClaw build from source

### cloudflare (optional)

- Cloudflare DNS + tunnel
- Requires: `CLOUDFLARE_DOMAIN`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- `make tf-apply` writes `CLOUDFLARE_TUNNEL_TOKEN` back to `.env`

### s3 (optional)

- Backup bucket for n8n assets
- Requires: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`

### github (optional)

- Repo secrets, webhooks
- Requires: `GITHUB_TOKEN`, `GITHUB_OWNER`

## Terraform Configuration

Variables are sourced from `.env` via `scripts/env-to-tfvars.sh`. The Makefile sources this before terraform commands.

Key mappings:
- `PRLDEVOPS_ROOT_PASSWORD` → `TF_VAR_parallels_password`
- `CLOUDFLARE_*` → `TF_VAR_cloudflare_*`
- `AWS_*` → `TF_VAR_aws_*`
- `GITHUB_*` → `TF_VAR_github_*`

## Adding New Resources

1. Add variable to `terraform/variables.tf` if needed
2. Add mapping in `scripts/env-to-tfvars.sh` if value comes from .env
3. Create or update module in `terraform/modules/`
4. Reference in `terraform/main.tf`
5. Run `make tf-plan` to preview, then `make tf-apply`

## Best Practices

1. **Always plan first**: Run `make tf-plan` before `make tf-apply`
2. **State**: Terraform state is local; consider remote backend for team use
3. **Feature flags**: Toggle optional modules via .env vars (leave empty to disable)
4. **Secrets**: Never commit .env; use `TF_VAR_` from env-to-tfvars.sh
5. **Destroy order**: `make tf-destroy` tears down in correct order; use `make destroy` for full stack teardown
