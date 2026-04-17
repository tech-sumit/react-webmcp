import fs from "node:fs/promises";
import path from "node:path";

import {
  pairingCodeSchema,
  type PairingCode,
  registeredDeviceSchema,
  type RegisteredDevice,
  sessionRequestSchema,
  type SessionRequest,
} from "@nord-meshnet/protocol";

export interface PersistedSession extends SessionRequest {
  tokens?: {
    hostToken: string;
    viewerToken: string;
  };
}

interface ControlPlaneState {
  devices: RegisteredDevice[];
  pairings: PairingCode[];
  sessions: PersistedSession[];
}

const emptyState = (): ControlPlaneState => ({
  devices: [],
  pairings: [],
  sessions: [],
});

export class ControlPlaneStore {
  private state: ControlPlaneState = emptyState();

  constructor(private readonly stateFile: string) {}

  async load(): Promise<void> {
    try {
      const raw = await fs.readFile(this.stateFile, "utf8");
      const parsed = JSON.parse(raw) as Partial<ControlPlaneState>;

      this.state = {
        devices: (parsed.devices ?? []).map((device) => registeredDeviceSchema.parse(device)),
        pairings: (parsed.pairings ?? []).map((pairing) => pairingCodeSchema.parse(pairing)),
        sessions: (parsed.sessions ?? []).map((session) => {
          const validated = sessionRequestSchema.parse(session);
          return {
            ...validated,
            tokens: session.tokens,
          };
        }),
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        await fs.mkdir(path.dirname(this.stateFile), { recursive: true });
        await this.save();
        return;
      }

      throw error;
    }
  }

  listDevices(): RegisteredDevice[] {
    return structuredClone(this.state.devices);
  }

  getDevice(deviceId: string): RegisteredDevice | undefined {
    return this.state.devices.find((device) => device.deviceId === deviceId);
  }

  validateDeviceSecret(deviceId: string, deviceSecret: string): boolean {
    const device = this.getDevice(deviceId);
    return Boolean(device && device.deviceSecret === deviceSecret);
  }

  async upsertDevice(device: RegisteredDevice): Promise<RegisteredDevice> {
    const validated = registeredDeviceSchema.parse(device);
    const index = this.state.devices.findIndex((item) => item.deviceId === validated.deviceId);

    if (index >= 0) {
      this.state.devices[index] = validated;
    } else {
      this.state.devices.push(validated);
    }

    await this.save();
    return structuredClone(validated);
  }

  async setDevicePresence(
    deviceId: string,
    presence: RegisteredDevice["presence"],
  ): Promise<RegisteredDevice | undefined> {
    const device = this.getDevice(deviceId);
    if (!device) {
      return undefined;
    }

    const updated = registeredDeviceSchema.parse({
      ...device,
      presence: {
        ...device.presence,
        ...presence,
      },
    });

    return this.upsertDevice(updated);
  }

  async addTrustedDevice(hostDeviceId: string, trustedDeviceId: string): Promise<void> {
    const host = this.getDevice(hostDeviceId);
    if (!host) {
      return;
    }

    if (!host.trustedDeviceIds.includes(trustedDeviceId)) {
      host.trustedDeviceIds.push(trustedDeviceId);
      await this.upsertDevice(host);
    }
  }

  async createPairing(pairing: PairingCode): Promise<PairingCode> {
    const validated = pairingCodeSchema.parse(pairing);
    this.state.pairings = this.state.pairings.filter((item) => item.code !== validated.code);
    this.state.pairings.push(validated);
    await this.save();
    return structuredClone(validated);
  }

  async claimPairing(code: string, claimedByDeviceId: string): Promise<PairingCode | undefined> {
    const pairing = this.state.pairings.find((item) => item.code === code);
    if (!pairing) {
      return undefined;
    }

    pairing.claimedByDeviceId = claimedByDeviceId;
    await this.save();
    return structuredClone(pairing);
  }

  getPairing(code: string): PairingCode | undefined {
    return this.state.pairings.find((item) => item.code === code);
  }

  async pruneExpiredPairings(nowIso: string): Promise<void> {
    this.state.pairings = this.state.pairings.filter((pairing) => pairing.expiresAt > nowIso);
    await this.save();
  }

  async createSession(session: PersistedSession): Promise<PersistedSession> {
    const validated = sessionRequestSchema.parse(session);
    const persisted: PersistedSession = {
      ...validated,
      tokens: session.tokens,
    };
    this.state.sessions = this.state.sessions.filter((item) => item.sessionId !== persisted.sessionId);
    this.state.sessions.push(persisted);
    await this.save();
    return structuredClone(persisted);
  }

  getSession(sessionId: string): PersistedSession | undefined {
    const session = this.state.sessions.find((item) => item.sessionId === sessionId);
    return session ? structuredClone(session) : undefined;
  }

  listSessions(): PersistedSession[] {
    return structuredClone(this.state.sessions);
  }

  async updateSession(
    sessionId: string,
    mutate: (session: PersistedSession) => PersistedSession,
  ): Promise<PersistedSession | undefined> {
    const index = this.state.sessions.findIndex((item) => item.sessionId === sessionId);
    if (index === -1) {
      return undefined;
    }

    const existingSession = this.state.sessions[index];
    if (!existingSession) {
      return undefined;
    }

    const nextSession = mutate(structuredClone(existingSession));
    const validated = sessionRequestSchema.parse(nextSession);
    this.state.sessions[index] = {
      ...validated,
      tokens: nextSession.tokens,
    };
    await this.save();
    return structuredClone(this.state.sessions[index]);
  }

  async save(): Promise<void> {
    await fs.mkdir(path.dirname(this.stateFile), { recursive: true });
    await fs.writeFile(this.stateFile, JSON.stringify(this.state, null, 2));
  }
}
