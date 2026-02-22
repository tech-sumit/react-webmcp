variable "parallels_password" {
  description = "Root password for prldevops REST API"
  type        = string
  sensitive   = true
}

# =============================================================================
# VM SSH connection (for Ansible provisioning)
# =============================================================================

variable "vm_user" {
  description = "SSH user for the Parallels VM"
  type        = string
  default     = "parallels"
}

variable "vm_ssh_port" {
  description = "NAT-forwarded SSH port for the Parallels VM (localhost)"
  type        = string
  default     = "2222"
}
