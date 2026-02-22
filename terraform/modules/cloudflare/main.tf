###############################################################################
# Cloudflare Module -- Tunnel + DNS
###############################################################################

# Look up the zone
data "cloudflare_zone" "domain" {
  name = var.cloudflare_domain
}

# DNS CNAME record pointing to the tunnel
resource "cloudflare_record" "n8n" {
  zone_id = data.cloudflare_zone.domain.id
  name    = var.n8n_subdomain
  content = "${cloudflare_tunnel.n8n.id}.cfargotunnel.com"
  type    = "CNAME"
  proxied = true
  ttl     = 1  # Auto TTL when proxied

  comment = "n8n automation engine - managed by Terraform"
}

# DNS CNAME for OpenClaw gateway dashboard
resource "cloudflare_record" "openclaw" {
  zone_id = data.cloudflare_zone.domain.id
  name    = var.openclaw_subdomain
  content = "${cloudflare_tunnel.n8n.id}.cfargotunnel.com"
  type    = "CNAME"
  proxied = true
  ttl     = 1

  comment = "OpenClaw AI Gateway - managed by Terraform"
}

# Random secret for tunnel (the tunnel token JWT is derived from this)
resource "random_id" "tunnel_secret" {
  byte_length = 32
}

# Cloudflare Tunnel
resource "cloudflare_tunnel" "n8n" {
  account_id = var.cloudflare_account_id
  name       = "n8n-local"
  secret     = random_id.tunnel_secret.b64_std
}

# Tunnel configuration (ingress rules)
resource "cloudflare_tunnel_config" "n8n" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_tunnel.n8n.id

  config {
    # OpenClaw AI Gateway -- VM is on the Parallels shared network (VM_IP),
    # directly reachable from cloudflared running with network_mode:host.
    ingress_rule {
      hostname = "${var.openclaw_subdomain}.${var.cloudflare_domain}"
      service  = "http://${var.vm_ip}:18789"
    }

    # n8n -- reachable on host because of ports binding in docker-compose
    ingress_rule {
      hostname = "${var.n8n_subdomain}.${var.cloudflare_domain}"
      service  = "http://localhost:5678"
    }

    # Catch-all rule (required by Cloudflare)
    ingress_rule {
      service = "http_status:404"
    }
  }
}

# =============================================================================
# Cloudflare Access -- protect OpenClaw behind email-gated login
# Created only when cloudflare_access_email is set in .env
# =============================================================================

resource "cloudflare_access_application" "openclaw" {
  count      = var.cloudflare_access_email != "" ? 1 : 0
  account_id = var.cloudflare_account_id
  name       = "OpenClaw AI Gateway"
  domain     = "${var.openclaw_subdomain}.${var.cloudflare_domain}"
  type       = "self_hosted"

  session_duration = "24h"
}

resource "cloudflare_access_policy" "openclaw_allow" {
  count          = var.cloudflare_access_email != "" ? 1 : 0
  application_id = cloudflare_access_application.openclaw[0].id
  account_id     = var.cloudflare_account_id
  name           = "Allow owner"
  precedence     = 1
  decision       = "allow"

  include {
    email = [var.cloudflare_access_email]
  }
}

# Outputs
output "dns_record" {
  description = "Full DNS name for n8n"
  value       = "${var.n8n_subdomain}.${var.cloudflare_domain}"
}

output "tunnel_id" {
  description = "Cloudflare tunnel ID"
  value       = cloudflare_tunnel.n8n.id
}

output "tunnel_token" {
  description = "Cloudflare tunnel connector token (use as CLOUDFLARE_TUNNEL_TOKEN in .env)"
  value       = cloudflare_tunnel.n8n.tunnel_token
  sensitive   = true
}
