# Pages CMS - Docker Local Setup

Run [Pages CMS](https://pagescms.org) locally with Docker, exposed via Cloudflare tunnel at `cms.panditai.org`.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [GitHub CLI (gh)](https://cli.github.com/) – `brew install gh` then `gh auth login`
- [Resend](https://resend.com) account (for auth emails)
- Main n8n stack running (provides Cloudflare tunnel on the host)

## Architecture

Pages CMS runs as a separate docker-compose stack. The main n8n stack's `cloudflared` service (running with `network_mode: host`) routes `cms.panditai.org` to `localhost:3000`.

```
Cloudflare Tunnel (main n8n stack)
  └── cms.panditai.org → localhost:3000
        └── pages-cms-docker/docker-compose.yml
              ├── pages-cms (port 3000)
              └── postgres (port 5433 on host, 5432 internal)
```

PostgreSQL uses host port 5433 to avoid conflicting with the main n8n stack's postgres.

## Quick Start

1. **Ensure Cloudflare tunnel route exists** (one-time, from repo root):
   ```bash
   make tf-apply
   ```
   This creates the `cms.panditai.org` DNS record and tunnel ingress rule.

2. **Run the setup script** (generates secrets, opens GitHub App creation):
   ```bash
   ./setup.sh
   ```

3. **Complete GitHub App creation** in the browser that opens:
   - The callback URL and webhook URL are pre-filled with `cms.panditai.org`
   - Set Webhook secret to the value the script printed
   - After creating: copy App ID, Client ID, Client Secret; download the private key

4. **Fill remaining values in .env:**
   ```bash
   # Edit .env: add GITHUB_APP_ID, GITHUB_APP_NAME, GITHUB_APP_CLIENT_ID, GITHUB_APP_CLIENT_SECRET
   # Add private key:
   ./setup.sh /path/to/your-app.pem
   # Add RESEND_API_KEY from resend.com
   ```

5. **Run:**
   ```bash
   docker compose up --build
   ```

6. **Open** https://cms.panditai.org

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BASE_URL` | Yes | Public URL (`https://cms.panditai.org`) |
| `CRYPTO_KEY` | Yes | `openssl rand -base64 32` |
| `GITHUB_APP_ID` | Yes | From GitHub App |
| `GITHUB_APP_NAME` | Yes | App slug (e.g. `pages-cms`) |
| `GITHUB_APP_PRIVATE_KEY` | Yes | PEM key from GitHub App |
| `GITHUB_APP_WEBHOOK_SECRET` | Yes | Webhook secret you set |
| `GITHUB_APP_CLIENT_ID` | Yes | From GitHub App |
| `GITHUB_APP_CLIENT_SECRET` | Yes | From GitHub App |
| `RESEND_API_KEY` | Yes | From resend.com |
| `RESEND_FROM_EMAIL` | Yes | Verified sender (e.g. `onboarding@resend.dev`) |
| `CRON_SECRET` | Yes | `openssl rand -base64 32` |

PostgreSQL and `DATABASE_URL` are configured automatically by docker-compose.
