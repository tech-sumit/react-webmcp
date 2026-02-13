###############################################################################
# Parallels Desktop Ubuntu 24.04 VM
#
# Uses the official parallels-desktop Terraform provider.
# Requires Parallels Desktop Pro or Business edition.
#
# NOTE: The parallels-desktop provider API evolves frequently. Check the
# latest docs at https://registry.terraform.io/providers/Parallels/parallels-desktop/latest/docs
# and adjust resource attributes as needed for your provider version.
###############################################################################

# Step 1: Deploy the DevOps API service on the macOS host
resource "parallels-desktop_deploy" "devops_api" {
  api_config {
    port           = "8080"
    prefix         = "/api"
    root_password  = var.parallels_password
    enable_tls     = false
    enable_logging = true
  }
}

# Step 2: Create the Ubuntu 24.04 VM
resource "parallels-desktop_remote_vm" "n8n_worker" {
  host             = "http://localhost:8080"
  name             = var.vm_name
  catalog_id       = "ubuntu-24.04-arm64"
  path             = var.vm_path
  catalog_connection = "host=root:${var.parallels_password}@localhost:8080"

  authenticator {
    username = "root@localhost"
    password = var.parallels_password
  }

  config {
    start_headless     = true
    enable_rosetta     = true
    auto_start_on_host = true
  }

  specs {
    cpu_count   = var.vm_cpu
    memory_size = var.vm_memory
  }

  # Port forwarding: SSH
  reverse_proxy_host {
    port = var.vm_ssh_port
    tcp_route {
      target_port = "22"
    }
  }

  # Port forwarding: n8n
  reverse_proxy_host {
    port = var.n8n_port
    tcp_route {
      target_port = var.n8n_port
    }
  }

  # Port forwarding: Vault
  reverse_proxy_host {
    port = var.vault_port
    tcp_route {
      target_port = var.vault_port
    }
  }

  # Port forwarding: OpenClaw Gateway
  reverse_proxy_host {
    port = var.openclaw_port
    tcp_route {
      target_port = var.openclaw_port
    }
  }

  # Only share the /shared subdirectory -- no host data leaks into VM
  shared_folder {
    name = "n8n_shared"
    path = abspath(var.shared_dir)
  }

  # Base provisioning: install packages only.
  # Repo files delivered via SCP (make vm-sync).
  post_processor_script {
    retry {
      attempts              = 3
      wait_between_attempts = "15s"
    }
    inline = [
      "#!/bin/bash",
      "set -euo pipefail",
      # System updates
      "sudo apt-get update && sudo apt-get upgrade -y",
      # Docker
      "curl -fsSL https://get.docker.com | sudo sh",
      "sudo usermod -aG docker $USER",
      # Docker Compose plugin
      "sudo apt-get install -y docker-compose-plugin",
      # Node.js 22 (for OpenClaw)
      "curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -",
      "sudo apt-get install -y nodejs",
      # Utilities
      "sudo apt-get install -y jq git curl make rsync",
      # OpenClaw
      "sudo npm install -g openclaw@latest",
      # Create project directory (files arrive via SCP)
      "mkdir -p /home/parallels/n8n",
    ]
  }

  # Cleanup script on destroy
  on_destroy_script {
    retry {
      attempts              = 2
      wait_between_attempts = "5s"
    }
    inline = [
      "cd /home/parallels/n8n && docker compose down --timeout 30 || true",
    ]
  }

  keep_running = true

  depends_on = [parallels-desktop_deploy.devops_api]
}
