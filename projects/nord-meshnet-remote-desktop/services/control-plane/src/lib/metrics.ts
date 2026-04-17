import { collectDefaultMetrics, Counter, Gauge, Registry } from "prom-client";

import type { ControlPlaneStore } from "../store.js";

export class ControlPlaneMetrics {
  readonly registry = new Registry();
  readonly deviceRegistrations = new Counter({
    name: "nord_meshnet_device_registrations_total",
    help: "Number of device registration upserts",
    registers: [this.registry],
  });
  readonly pairingCodes = new Counter({
    name: "nord_meshnet_pairing_codes_total",
    help: "Number of pairing codes created",
    registers: [this.registry],
  });
  readonly sessionRequests = new Counter({
    name: "nord_meshnet_session_requests_total",
    help: "Number of remote desktop session requests",
    registers: [this.registry],
    labelNames: ["mode", "state"] as const,
  });
  readonly onlineDevices = new Gauge({
    name: "nord_meshnet_online_devices",
    help: "Currently online devices registered with the control plane",
    registers: [this.registry],
  });
  readonly activeSessions = new Gauge({
    name: "nord_meshnet_active_sessions",
    help: "Sessions that are approved, connecting, or active",
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry });
  }

  syncFromStore(store: ControlPlaneStore): void {
    const devices = store.listDevices();
    const sessions = store.listSessions();

    this.onlineDevices.set(devices.filter((device) => device.presence.online).length);
    this.activeSessions.set(
      sessions.filter((session) =>
        ["approved", "connecting", "active"].includes(session.state),
      ).length,
    );
  }
}
