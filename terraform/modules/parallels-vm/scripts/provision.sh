#!/bin/bash
###############################################################################
# VM Bootstrap Script
# Installs Docker, Node.js 22, OpenClaw, and system utilities.
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

# Node.js 22 (for OpenClaw)
echo "Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# System utilities
echo "Installing utilities..."
sudo apt-get install -y jq git curl make rsync

# OpenClaw
echo "Installing OpenClaw..."
sudo npm install -g openclaw@latest

# Create project directory
mkdir -p /home/parallels/n8n

echo "=== VM Provisioning Complete ==="
echo "Docker: $(docker --version)"
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "OpenClaw: $(openclaw --version 2>/dev/null || echo 'installed')"
