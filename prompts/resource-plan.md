# Prompt: Plan Infrastructure for a Task

## Input

You are given a workflow or task that may require additional infrastructure resources. Plan what's needed.

## Task Description

{{TASK}}

## Instructions

1. **Analyze requirements**:
   - What external services does this task need?
   - What data storage is required?
   - What networking/access is needed?
   - What credentials/secrets are involved?

2. **Map to infrastructure**:

   | Requirement | Infrastructure | Module |
   |-------------|---------------|--------|
   | File storage | S3 bucket | `terraform/modules/s3` |
   | DNS/webhooks | Cloudflare | `terraform/modules/cloudflare` |
   | Code/assets repo | GitHub | `terraform/modules/github` |
   | Secrets | Vault | Already running |
   | Compute | VM resources | `terraform/modules/parallels-vm` |

3. **Plan Terraform changes**:
   - New modules needed?
   - Existing module modifications?
   - New variables for `.env`?
   - Estimated cost (if cloud resources)?

4. **Plan Vault secrets**:
   - What credentials to store?
   - Naming convention: `secret/n8n/{service}_{credential_type}`
   - Rotation schedule?

5. **Plan n8n credentials**:
   - What n8n credential types to create?
   - How they map to Vault secrets?

6. **Execution order**:
   1. Terraform apply (create resources)
   2. Store credentials in Vault
   3. Configure n8n credentials (External Secrets)
   4. Create/update workflow
   5. Test
   6. Export and commit

## Output Format

```
## Resources Needed
- [List of infrastructure resources]

## Terraform Changes
- [Module additions/modifications]

## Secrets to Store
- [Vault path: description]

## n8n Credentials
- [Credential type: Vault reference]

## Execution Steps
1. [Ordered steps]

## Estimated Cost
- [Monthly cost estimate, if applicable]
```
