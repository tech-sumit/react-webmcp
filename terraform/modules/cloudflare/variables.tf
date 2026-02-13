variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "cloudflare_domain" {
  description = "Domain name (e.g., yourdomain.com)"
  type        = string
}

variable "n8n_webhook_url" {
  description = "Public n8n webhook URL"
  type        = string
  default     = ""
}

variable "n8n_subdomain" {
  description = "Subdomain for n8n (e.g., 'n8n' for n8n.yourdomain.com)"
  type        = string
  default     = "n8n"
}
