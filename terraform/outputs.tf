###############################################################################
# Root Terraform Outputs
###############################################################################

output "vm_name" {
  description = "Name of the created VM"
  value       = module.parallels_vm.vm_name
}

output "vm_ssh_command" {
  description = "SSH command to connect to the VM"
  value       = module.parallels_vm.ssh_command
}

output "n8n_local_url" {
  description = "Local n8n URL (via port forwarding)"
  value       = "http://localhost:${var.n8n_port}"
}

output "vault_local_url" {
  description = "Local Vault URL (via port forwarding)"
  value       = "http://localhost:${var.vault_port}"
}

output "cloudflare_dns_record" {
  description = "Cloudflare DNS record for n8n"
  value       = var.cloudflare_api_token != "" ? module.cloudflare[0].dns_record : "Not configured"
}

output "cloudflare_tunnel_token" {
  description = "Cloudflare tunnel connector token for cloudflared (set as CLOUDFLARE_TUNNEL_TOKEN in .env)"
  value       = var.cloudflare_api_token != "" ? module.cloudflare[0].tunnel_token : ""
  sensitive   = true
}
