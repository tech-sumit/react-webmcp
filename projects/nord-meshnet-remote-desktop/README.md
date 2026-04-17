# Nord Meshnet Remote Desktop

Private remote desktop stack for your own Nord Meshnet devices, with an Electron desktop app, a React Native mobile shell, and a Meshnet-only control plane for pairing, approvals, signaling, and session audit.

## What This Project Ships

- Meshnet-only control plane for device registry, pairing codes, session approval, signaling, audit logs, and Prometheus metrics.
- Electron desktop app for macOS and Windows host/controller workflows.
- React Native mobile shell for Android and iOS controllers, backed by a hosted session page inside a WebView.
- Android host bridge contracts and capability wiring for a future native capture/input bridge.
- A gated iOS host path that stays capability-driven instead of pretending public App Store APIs can do unrestricted remote control.

## Current Platform Reality

- `macOS` host: implemented as the primary host/controller path.
- `Windows` host: shares the same Electron host/controller flow.
- `Android` controller: implemented through the React Native shell and hosted controller page.
- `Android` host: bridge contract and registration flow are implemented, but the capture/injection bridge still needs device-side native work before it becomes full TeamViewer-class hosting.
- `iOS` controller: implemented through the React Native shell and hosted controller page.
- `iOS` host: intentionally gated behind an enterprise/private-distribution track.

## Quick Start

```bash
cd projects/nord-meshnet-remote-desktop
cp .env.example .env
# Update CONTROL_PLANE_PUBLIC_BASE_URL to a Meshnet-reachable address, e.g.:
# http://100.x.y.z:8789

make setup
make control-plane
```

In a second terminal:

```bash
cd projects/nord-meshnet-remote-desktop
make desktop
```

In a third terminal for mobile development:

```bash
cd projects/nord-meshnet-remote-desktop
make mobile
```

## Session Model

1. Each app instance creates a local device identity and registers with the control plane.
2. A host creates a short-lived pairing code, or a trusted controller requests an unattended session.
3. The control plane notifies the host, records the approval decision, and issues ephemeral session tokens.
4. Media flows over WebRTC; control events, approvals, audit events, and fallback file/clipboard relays stay on the Meshnet-only control plane.

## Repo Integration

- Root make targets delegate into this project.
- Control-plane metrics and log files can be scraped by the repo-level Grafana Alloy stack.
- The project keeps its own workspace and env template so it does not force the root repo into a JS monorepo layout.

## Important Limits

- Full iOS remote host control is not implemented as a public-distribution feature because the platform does not allow a normal App Store app to behave like TeamViewer-host unrestricted system control.
- The Android host path is shaped for a future native bridge and enterprise-grade capabilities, but it is not yet a polished zero-friction host agent.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the internal package layout and session flow.
