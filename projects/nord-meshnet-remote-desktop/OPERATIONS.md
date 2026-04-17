# Operations

## First Run

```bash
cd projects/nord-meshnet-remote-desktop
cp .env.example .env
```

Update at least:

- `CONTROL_PLANE_PUBLIC_BASE_URL` to a Meshnet-reachable IP or hostname.
- `SESSION_HMAC_SECRET` to a unique secret.

Then install and build:

```bash
make setup
make build
```

## Day-To-Day Commands

From the repo root:

```bash
make meshnet-setup
make meshnet-control-plane
make meshnet-desktop
make meshnet-mobile
make meshnet-health
```

From the project root:

```bash
make control-plane
make desktop
make mobile
./scripts/health-check.sh
```

## Desktop Host Permissions

### macOS

- Grant Screen Recording permission to Electron when prompted.
- Grant Accessibility permission if you want pointer and keyboard injection to work.

### Windows

- Screen capture works through the desktop picker.
- Input injection relies on the native desktop bridge dependency installed with the app.

## Mobile Notes

- Android controller support works through the React Native shell and the hosted controller page.
- Android host support is wired as a beta bridge contract and still needs the native `MeshnetHost` module to be bundled for full device-side capture/input.
- iOS host support remains a gated enterprise/private-distribution track.

## Observability

- Metrics: `GET /metrics`
- Health: `GET /health`
- Logs: `CONTROL_PLANE_LOG_FILE`, which defaults to `../../data/nord-meshnet-logs/control-plane.log`

If the root Alloy stack is running, it can scrape the control-plane metrics from `HOST_IP:8789` and tail the control-plane log file from the repo `data/` directory.

## Troubleshooting

### Control Plane Won't Start

```bash
cd projects/nord-meshnet-remote-desktop
npm run doctor
```

Check that:

- `.env` exists
- `SESSION_HMAC_SECRET` is set
- `CONTROL_PLANE_PUBLIC_BASE_URL` points to the same host/port you intend to reach over Meshnet

### Session Connects But Input Does Nothing

- Re-check desktop accessibility permissions on macOS.
- Confirm the host is the Electron desktop app, not the mobile beta host path.
- Make sure the host approved the session and stayed online after approval.

### Grafana Shows No Remote Desktop Data

- Confirm the control plane is listening on the host address Alloy can scrape.
- Confirm the control-plane log path points at `data/nord-meshnet-logs/control-plane.log`.
- Restart the root Alloy container after config changes:

```bash
docker compose restart alloy
```
