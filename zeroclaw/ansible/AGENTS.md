# Agent Guidelines

## Project Overview

Ansible playbook for automated, hardened ZeroClaw installation on Debian/Ubuntu systems.

## Key Principles

1. **Security First**: Firewall must be configured before Docker installation
2. **One Command Install**: Ansible playbook should work out of the box
3. **Localhost Only**: All container ports bind to 127.0.0.1
4. **Defense in Depth**: UFW + DOCKER-USER + localhost binding + non-root container

## Critical Components

### Task Order
Docker must be installed **before** firewall configuration.

Task order in `roles/zeroclaw/tasks/main.yml`:
```yaml
- system-tools.yml   # System packages + build-essential
- tailscale.yml      # VPN setup (conditional)
- user.yml           # Create system user
- docker-linux.yml   # Install Docker (creates /etc/docker)
- firewall-linux.yml # Configure UFW + daemon.json (needs /etc/docker to exist)
- zeroclaw.yml       # Rust toolchain + build ZeroClaw from source
- observability.yml  # node-exporter + systemd services
```

### DOCKER-USER Chain
Located in `/etc/ufw/after.rules`. Uses dynamic interface detection (not hardcoded `eth0`).

**Never** use `iptables: false` in Docker daemon config - this would break container networking.

### Port Binding
Always use `127.0.0.1:HOST_PORT:CONTAINER_PORT` in docker-compose.yml, never `HOST_PORT:CONTAINER_PORT`.

## Code Style

### Ansible
- Use loops instead of repeated tasks
- Use `community.docker.docker_compose_v2` (not deprecated `docker_compose`)
- Always specify collections in `requirements.yml`

### Docker
- Multi-stage builds if needed
- USER directive for non-root
- Proper healthchecks
- Use `docker compose` (V2) not `docker-compose` (V1)
- No `version:` in compose files

## File Locations

### VM Paths
```
/home/zeroclaw/                 # User home
/home/zeroclaw/.zeroclaw/       # Config and data
/home/zeroclaw/.cargo/bin/      # ZeroClaw binary
/home/zeroclaw/code/zeroclaw/   # Source code
/etc/systemd/system/zeroclaw-gateway.service
/etc/systemd/system/zeroclaw-browser.service
/etc/docker/daemon.json
/etc/ufw/after.rules
```

### Repository
```
roles/zeroclaw/
├── tasks/       # Ansible tasks (order matters!)
├── templates/   # Jinja2 configs
├── defaults/    # Variables
└── handlers/    # Service restart handlers

requirements.yml # Ansible Galaxy collections
```
