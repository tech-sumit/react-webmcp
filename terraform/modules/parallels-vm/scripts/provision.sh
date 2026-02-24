#!/bin/bash
###############################################################################
# VM Bootstrap Script
# Installs Docker, Rust, ZeroClaw, and system utilities.
# Called by Terraform post_processor_script.
###############################################################################
set -euo pipefail

echo "=== VM Provisioning Start ==="

# System updates
echo "Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

# Docker
echo "Installing Docker..."
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"

# Docker Compose plugin
echo "Installing Docker Compose plugin..."
sudo apt-get install -y docker-compose-plugin

# Rust (for ZeroClaw)
echo "Installing Rust..."
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"

# System utilities
echo "Installing utilities..."
sudo apt-get install -y jq git curl make rsync build-essential pkg-config libssl-dev

# ZeroClaw
echo "Installing ZeroClaw..."
cargo install zeroclaw

# Create project directory
mkdir -p /home/parallels/n8n

echo "=== VM Provisioning Complete ==="
echo "Docker: $(docker --version)"
echo "Rust: $(rustc --version 2>/dev/null || echo 'installed')"
echo "ZeroClaw: $(zeroclaw --version 2>/dev/null || echo 'installed')"
