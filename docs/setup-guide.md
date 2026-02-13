# Setup Guide

## Prerequisites

### Required (macOS Host)

1. **Parallels Desktop Pro or Business edition**
   - Required for the DevOps API that Terraform uses
   - Standard edition will NOT work
   - Download: https://www.parallels.com/products/desktop/

2. **Terraform CLI**
   ```bash
   brew install terraform
   ```

3. **Git**
   ```bash
   # Usually pre-installed on macOS
   git --version
   ```

### External Accounts (Free Tiers Available)

4. **Cloudflare account** (for tunnel + DNS)
   - Sign up: https://dash.cloudflare.com/sign-up
   - Add your domain to Cloudflare
   - Create an API token with DNS and Tunnel permissions
   - Create a tunnel: Zero Trust > Tunnels > Create tunnel
   - Note the tunnel token

5. **Grafana Cloud account** (for observability)
   - Sign up: https://grafana.com/auth/sign-up/create-user
   - Free tier: 10k metrics, 50GB logs/month
   - Note: Prometheus URL, Loki URL, instance ID, API key, stack URL

6. **LLM API key** (for OpenClaw AI agent)
   - Anthropic recommended: https://console.anthropic.com/
   - Or any provider supported by OpenClaw

### Optional

7. **AWS account** (for S3 bucket module)
8. **GitHub account** (for repository module)

## Installation

### Step 1: Clone the Repository

```bash
git clone <repo-url> ~/CODE/sumit/n8n
cd ~/CODE/sumit/n8n
```

### Step 2: Configure Environment

```bash
# Create .env from template
cp .env.example .env

# Auto-generate internal secrets
make generate-secrets
```

### Step 3: Fill in External Secrets

Edit `.env` and fill in the REQUIRED values:

```bash
# Cloudflare
CLOUDFLARE_TUNNEL_TOKEN=<from step 4>
CLOUDFLARE_DOMAIN=yourdomain.com
CLOUDFLARE_API_TOKEN=<from step 4>
CLOUDFLARE_ACCOUNT_ID=<from step 4>

# n8n
N8N_WEBHOOK_URL=https://n8n.yourdomain.com/

# Grafana Cloud
GRAFANA_CLOUD_PROMETHEUS_URL=<from step 5>
GRAFANA_CLOUD_LOKI_URL=<from step 5>
GRAFANA_CLOUD_USER=<instance ID>
GRAFANA_CLOUD_API_KEY=<from step 5>
GRAFANA_CLOUD_STACK_URL=https://yourstack.grafana.net

# OpenClaw AI Agent
OPENCLAW_API_KEY=<from step 6>
```

### Step 4: Bootstrap

```bash
make up
```

This single command will:
1. Validate all required environment variables
2. Initialize and apply Terraform (creates the VM)
3. Provision the VM with Docker, Node.js, OpenClaw
4. Sync repo files into the VM
5. Seed Vault with agent secrets
6. Start the 9-service Docker Compose stack
7. Configure OpenClaw agent
8. Push dashboards and alerts to Grafana Cloud
9. Run health checks

**Estimated time: 10-15 minutes** (mostly VM creation and package installation)

### Step 5: Verify

```bash
# Check status
make status

# Run health checks
make health

# Open n8n UI
open http://localhost:5678

# Open Vault UI
open http://localhost:8200/ui

# Open Grafana Cloud
make grafana
```

## Cloudflare Tunnel Setup (Detailed)

1. Log in to Cloudflare dashboard
2. Go to Zero Trust > Networks > Tunnels
3. Click "Create a tunnel"
4. Name it `n8n-local`
5. Choose "Cloudflared" connector
6. Copy the tunnel token (long base64 string)
7. Add a public hostname:
   - Subdomain: `n8n`
   - Domain: `yourdomain.com`
   - Service: `http://n8n:5678`
8. Save the tunnel
9. Paste the token in `.env` as `CLOUDFLARE_TUNNEL_TOKEN`

## Grafana Cloud Setup (Detailed)

1. Sign up at https://grafana.com
2. In your stack, go to Connections > Add new connection
3. Search for "Hosted metrics" and note:
   - Remote write endpoint (PROMETHEUS_URL)
   - Instance ID (USER)
4. Search for "Hosted logs" and note:
   - Loki push endpoint (LOKI_URL)
5. Go to Administration > API keys
   - Create a key with "MetricsPublisher" and "LogsPublisher" roles
   - Note the API key

## Troubleshooting

### Terraform fails to create VM
- Ensure Parallels Desktop Pro/Business is installed and running
- Check that no other VM with the same name exists
- Try: `prlctl list -a` to see existing VMs

### Cannot SSH into VM
- Wait 30-60 seconds after VM creation
- Check: `prlctl status n8n-ai-worker`
- Try: `ssh -v -p 2222 parallels@localhost` for debug output

### n8n not accessible
- Check: `make status`
- Check: `make logs SERVICE=n8n`
- Ensure port 5678 is not used by another process

### Grafana Cloud not receiving data
- Check Alloy logs: `make logs SERVICE=alloy`
- Verify credentials in `.env`
- Check Grafana Cloud > Explore for incoming data
