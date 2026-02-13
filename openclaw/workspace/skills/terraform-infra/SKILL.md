# Skill: Terraform Infrastructure Management

## Description

Plan and apply Terraform changes, show current resource state, and manage infrastructure modules.

## When to Use

- Need to create or modify infrastructure (VM, DNS, S3, GitHub repo)
- Need to check current infrastructure state
- User requests a new cloud resource
- Need to resize the VM or change port forwarding

## How to Use

### Preview changes
```bash
make tf-plan
```

### Apply changes
```bash
make tf-apply
```

### Show current state
```bash
cd terraform && terraform show
```

### Destroy all infrastructure
```bash
make tf-destroy
```

### Target specific modules
```bash
# VM only
make vm-create   # terraform apply -target=module.parallels_vm
make vm-destroy  # terraform destroy -target=module.parallels_vm

# Check VM status
make vm-status
```

## Available Modules

### parallels-vm (always active)
- Creates Ubuntu 24.04 VM via Parallels Desktop
- Installs Docker, Node.js 22, OpenClaw
- Port forwarding: SSH (2222), n8n (5678), Vault (8200), OpenClaw (18789)
- Shared folder: `shared/` only

### cloudflare (conditional -- needs API token)
- DNS CNAME records
- Cloudflare Tunnel
- WAF rate limiting on webhooks
- Cache bypass for API endpoints

### s3 (conditional -- needs AWS credentials)
- S3 bucket with versioning
- Lifecycle rules (IA transition, version cleanup)
- Server-side encryption
- IAM user with scoped access

### github (conditional -- needs GitHub token)
- Repository for workflow assets
- Branch protection on main
- Webhook for CI integration

## Terraform Configuration

All variables flow from `.env` via `scripts/env-to-tfvars.sh`. No separate `terraform.tfvars` needed.

Key variables:
- `VM_CPU_COUNT`, `VM_MEMORY_MB` -- VM sizing
- `VM_SSH_PORT` -- SSH port forwarding
- `CLOUDFLARE_DOMAIN` -- DNS domain
- `AWS_REGION`, `S3_BUCKET_PREFIX` -- S3 config

## Adding New Resources

1. Create a new module in `terraform/modules/{name}/`
2. Add `main.tf` and `variables.tf`
3. Reference it in `terraform/main.tf` (use `count` for conditional)
4. Map any needed `.env` variables in `scripts/env-to-tfvars.sh`
5. Run `make tf-plan` then `make tf-apply`

## Best Practices

- Always `tf-plan` before `tf-apply`
- Use conditional modules (`count`) for optional resources
- Keep state local (gitignored) for single-user setup
- Use `make vm-sync` after infrastructure changes to update VM files
