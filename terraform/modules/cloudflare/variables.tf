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

variable "zeroclaw_subdomain" {
  description = "Subdomain for ZeroClaw gateway (e.g., 'bot-0' for bot-0.panditai.org). Avoid underscores -- browsers reject them in HTTP hostnames."
  type        = string
  default     = "bot-0"
}

variable "cloudflare_access_email" {
  description = "Owner email for Cloudflare Access policy on ZeroClaw gateway. When set, creates an Access Application requiring login before reaching the origin."
  type        = string
  default     = ""
}

variable "cms_subdomain" {
  description = "Subdomain for Pages CMS (e.g., 'cms' for cms.panditai.org)"
  type        = string
  default     = "cms"
}

variable "vm_ip" {
  description = "IP address of the Parallels VM on the shared network (e.g., 10.211.55.10). Used as the origin for the ZeroClaw tunnel ingress."
  type        = string
  default     = "10.211.55.10"
}
