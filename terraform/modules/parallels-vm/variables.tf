variable "parallels_password" {
  description = "Root password for prldevops REST API"
  type        = string
  sensitive   = true
}

variable "vm_path" {
  description = "Path on host where VMs are stored"
  type        = string
  default     = "/Users/Shared/Parallels"
}

variable "vm_name" {
  description = "VM display name"
  type        = string
  default     = "n8n-ai-worker"
}

variable "vm_cpu" {
  description = "Number of vCPUs"
  type        = string
  default     = "4"
}

variable "vm_memory" {
  description = "RAM in MB"
  type        = string
  default     = "8192"
}

variable "vm_ssh_port" {
  description = "Host port forwarded to VM SSH"
  type        = string
  default     = "2222"
}

variable "n8n_port" {
  description = "n8n port to forward"
  type        = string
  default     = "5678"
}

variable "vault_port" {
  description = "Vault port to forward"
  type        = string
  default     = "8200"
}

variable "openclaw_port" {
  description = "OpenClaw gateway port to forward"
  type        = string
  default     = "18789"
}

variable "shared_dir" {
  description = "Host path to shared directory"
  type        = string
  default     = "./shared"
}
