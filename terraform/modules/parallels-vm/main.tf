###############################################################################
# Parallels Desktop DevOps API
#
# Deploys the prldevops REST API service on the macOS host.
# VM lifecycle is managed by the Makefile via prlctl (not Terraform).
#
# Requires Parallels Desktop Pro or Business edition.
###############################################################################

resource "parallels-desktop_deploy" "devops_api" {
  # Deploy locally -- no SSH needed (provider will use local prlctl)
  install_local = true

  api_config {
    port           = "8080"
    prefix         = "/api"
    root_password  = var.parallels_password
    enable_tls     = false
    enable_logging = true
  }
}

###############################################################################
# OpenClaw Ansible Provisioner
#
# Copies the openclaw/ansible playbook to the VM and runs it to install:
#   - Docker CE
#   - Node.js 22
#   - UFW firewall (SSH + Tailscale only)
#   - OpenClaw (release or development mode)
#
# Prerequisites (handled by Makefile before `terraform apply`):
#   - VM is created and running (via `make vm-create`)
#   - Port forwarding is active (via `make vm-ports`)
#   - SSH key auth is set up on the VM
###############################################################################

locals {
  ansible_dir = "${path.root}/../openclaw/ansible"
}

resource "null_resource" "ansible_provision" {
  depends_on = [parallels-desktop_deploy.devops_api]

  triggers = {
    # Re-run whenever the playbook or role defaults change
    playbook_hash = filesha256("${local.ansible_dir}/playbook.yml")
    defaults_hash = filesha256("${local.ansible_dir}/roles/openclaw/defaults/main.yml")
    vm_user       = var.vm_user
    vm_ssh_port   = var.vm_ssh_port
  }

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command     = "${path.module}/scripts/run-ansible.sh '${var.vm_user}' '${var.vm_ssh_port}' '${local.ansible_dir}'"
  }
}
