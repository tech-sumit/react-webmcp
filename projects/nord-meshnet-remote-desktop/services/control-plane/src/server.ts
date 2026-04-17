import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifySensible from "@fastify/sensible";
import fastifyStatic from "@fastify/static";
import { createSessionToken, generatePairingCode, randomId, verifySessionToken } from "@nord-meshnet/crypto";
import {
  deviceIdentitySchema,
  remoteInputEventSchema,
  rtcSignalMessageSchema,
  type SessionRequest,
} from "@nord-meshnet/protocol";
import { z } from "zod";
import { Server as SocketIOServer, type Socket } from "socket.io";

import { config } from "./config.js";
import { recordAuditEvent } from "./lib/audit.js";
import { ControlPlaneMetrics } from "./lib/metrics.js";
import { createLogger } from "./logger.js";
import { ControlPlaneStore, type PersistedSession } from "./store.js";

const app = Fastify({
  logger: false,
});

const logger = createLogger(config.logFile);
const store = new ControlPlaneStore(config.stateFile);
const metrics = new ControlPlaneMetrics();
const io = new SocketIOServer(app.server, {
  cors: {
    origin: true,
  },
});

const createPairingBodySchema = z.object({
  deviceId: z.string().min(8),
  deviceSecret: z.string().min(16),
});

const claimPairingBodySchema = createPairingBodySchema.extend({
  code: z.string().min(4),
});

const createSessionBodySchema = z.object({
  hostDeviceId: z.string().min(8),
  controllerDeviceId: z.string().min(8),
  controllerSecret: z.string().min(16),
  requestedMode: z.enum(["attended", "unattended"]),
  requestedFeatures: z
    .object({
      clipboard: z.boolean().default(true),
      fileTransfer: z.boolean().default(true),
      audio: z.boolean().default(false),
    })
    .default({
      clipboard: true,
      fileTransfer: true,
      audio: false,
    }),
});

const approveSessionBodySchema = z.object({
  deviceId: z.string().min(8),
  deviceSecret: z.string().min(16),
});

const getSessionQuerySchema = z.object({
  deviceId: z.string().min(8),
  deviceSecret: z.string().min(16),
});

const controllerLaunchQuerySchema = z.object({
  token: z.string().min(8),
});

const socketAuthSchema = z
  .object({
    deviceId: z.string().min(8).optional(),
    deviceSecret: z.string().min(16).optional(),
    sessionToken: z.string().min(8).optional(),
  })
  .refine((value) => Boolean(value.sessionToken || (value.deviceId && value.deviceSecret)), {
    message: "sessionToken or device credentials are required",
  });

const approveableStates = new Set(["pending", "approved", "connecting", "active"]);
const deviceSockets = new Map<string, Socket>();

function nowIso(): string {
  return new Date().toISOString();
}

function buildViewerLaunchUrl(session: PersistedSession): string | undefined {
  if (!session.tokens?.viewerToken) {
    return undefined;
  }

  return `${config.publicBaseUrl.replace(/\/$/, "")}/controller.html?token=${encodeURIComponent(
    session.tokens.viewerToken,
  )}`;
}

function sanitizeDevice<T extends { deviceSecret?: string }>(device: T): Omit<T, "deviceSecret"> {
  const { deviceSecret: _secret, ...rest } = device;
  return rest;
}

function sanitizeSessionForDevice(session: PersistedSession, deviceId: string) {
  return {
    ...session,
    tokens: undefined,
    viewerLaunchUrl: session.controllerDeviceId === deviceId ? buildViewerLaunchUrl(session) : undefined,
    hostToken: session.hostDeviceId === deviceId ? session.tokens?.hostToken : undefined,
  };
}

function emitToDevice(deviceId: string, event: string, payload: unknown): boolean {
  const socket = deviceSockets.get(deviceId);
  if (!socket) {
    return false;
  }

  socket.emit(event, payload);
  return true;
}

async function syncMetrics(): Promise<void> {
  metrics.syncFromStore(store);
}

function assertDeviceSecret(deviceId: string, deviceSecret: string): void {
  if (!store.validateDeviceSecret(deviceId, deviceSecret)) {
    throw app.httpErrors.unauthorized("Invalid device credentials");
  }
}

function assertSessionMembership(deviceId: string, session: PersistedSession): void {
  if (session.hostDeviceId !== deviceId && session.controllerDeviceId !== deviceId) {
    throw app.httpErrors.forbidden("Device is not part of this session");
  }
}

async function approveSession(sessionId: string, approvedByDeviceId: string): Promise<PersistedSession> {
  const current = store.getSession(sessionId);
  if (!current) {
    throw app.httpErrors.notFound("Session not found");
  }

  if (current.state === "approved" || current.state === "connecting" || current.state === "active") {
    return current;
  }

  const approved = await store.updateSession(sessionId, (session) => ({
    ...session,
    state: "approved",
    approvedAt: nowIso(),
    tokens: {
      hostToken: session.tokens?.hostToken ?? "",
      viewerToken: session.tokens?.viewerToken ?? "",
    },
  }));

  if (!approved) {
    throw app.httpErrors.notFound("Session not found after update");
  }

  approved.tokens = {
    hostToken: await createSessionToken(
      approved.sessionId,
      approved.hostDeviceId,
      "host",
      config.sessionRequestTtlSeconds * 10,
      config.sessionHmacSecret,
    ),
    viewerToken: await createSessionToken(
      approved.sessionId,
      approved.controllerDeviceId,
      "viewer-web",
      config.sessionRequestTtlSeconds * 10,
      config.sessionHmacSecret,
    ),
  };

  const stored = await store.updateSession(sessionId, (session) => ({
    ...session,
    state: "approved",
    approvedAt: approved.approvedAt,
    tokens: approved.tokens,
  }));

  if (!stored) {
    throw app.httpErrors.notFound("Session not found after token write");
  }

  emitToDevice(
    stored.hostDeviceId,
    "session:approved",
    sanitizeSessionForDevice(stored, stored.hostDeviceId),
  );
  emitToDevice(
    stored.controllerDeviceId,
    "session:approved",
    sanitizeSessionForDevice(stored, stored.controllerDeviceId),
  );

  metrics.sessionRequests.inc({
    mode: stored.requestedMode,
    state: "approved",
  });
  await syncMetrics();
  await recordAuditEvent(
    {
      type: "session.approved",
      payload: {
        sessionId,
        approvedByDeviceId,
        hostDeviceId: stored.hostDeviceId,
        controllerDeviceId: stored.controllerDeviceId,
      },
    },
    config,
    logger,
  );

  return stored;
}

async function rejectSession(sessionId: string, rejectedByDeviceId: string): Promise<PersistedSession> {
  const rejected = await store.updateSession(sessionId, (session) => ({
    ...session,
    state: "rejected",
    endedAt: nowIso(),
  }));

  if (!rejected) {
    throw app.httpErrors.notFound("Session not found");
  }

  emitToDevice(rejected.hostDeviceId, "session:rejected", {
    sessionId: rejected.sessionId,
    rejectedByDeviceId,
  });
  emitToDevice(rejected.controllerDeviceId, "session:rejected", {
    sessionId: rejected.sessionId,
    rejectedByDeviceId,
  });

  metrics.sessionRequests.inc({
    mode: rejected.requestedMode,
    state: "rejected",
  });
  await syncMetrics();
  await recordAuditEvent(
    {
      type: "session.rejected",
      payload: {
        sessionId,
        rejectedByDeviceId,
      },
    },
    config,
    logger,
  );

  return rejected;
}

async function bootstrap(): Promise<void> {
  await app.register(fastifyCors, {
    origin: true,
  });
  await app.register(fastifySensible);

  await app.register(fastifyStatic, {
    root: config.publicDir,
    prefix: "/",
    decorateReply: false,
  });

  await store.load();
  await syncMetrics();

  app.get("/health", async () => {
    const devices = store.listDevices();
    const sessions = store.listSessions();

    return {
      status: "ok",
      devices: {
        total: devices.length,
        online: devices.filter((device) => device.presence.online).length,
      },
      sessions: {
        total: sessions.length,
        active: sessions.filter((session) => approveableStates.has(session.state)).length,
      },
      publicBaseUrl: config.publicBaseUrl,
    };
  });

  app.get("/metrics", async (_request, reply) => {
    reply.header("Content-Type", metrics.registry.contentType);
    return metrics.registry.metrics();
  });

  app.get("/api/devices", async () => {
    const devices = store
      .listDevices()
      .sort((left, right) => Number(right.presence.online) - Number(left.presence.online));

    return {
      devices: devices.map((device) => sanitizeDevice(device)),
    };
  });

  app.post("/api/devices/register", async (request) => {
    const incoming = deviceIdentitySchema.parse(request.body);
    const existing = store.getDevice(incoming.deviceId);

    if (existing && existing.deviceSecret !== incoming.deviceSecret) {
      throw app.httpErrors.unauthorized("A device with this ID already exists");
    }

    const registered = await store.upsertDevice({
      ...incoming,
      trustedDeviceIds: existing?.trustedDeviceIds ?? [],
      presence: existing?.presence ?? {
        online: false,
        lastSeenAt: nowIso(),
      },
    });

    metrics.deviceRegistrations.inc();
    await syncMetrics();
    await recordAuditEvent(
      {
        type: "device.registered",
        payload: {
          deviceId: registered.deviceId,
          platform: registered.platform,
          name: registered.name,
        },
      },
      config,
      logger,
    );

    return {
      device: sanitizeDevice(registered),
    };
  });

  app.post("/api/pairings", async (request) => {
    const body = createPairingBodySchema.parse(request.body);
    assertDeviceSecret(body.deviceId, body.deviceSecret);

    await store.pruneExpiredPairings(nowIso());

    const pairing = await store.createPairing({
      code: generatePairingCode(),
      hostDeviceId: body.deviceId,
      createdAt: nowIso(),
      expiresAt: new Date(
        Date.now() + config.pairingCodeTtlSeconds * 1_000,
      ).toISOString(),
    });

    metrics.pairingCodes.inc();
    await syncMetrics();
    await recordAuditEvent(
      {
        type: "pairing.created",
        payload: {
          code: pairing.code,
          hostDeviceId: pairing.hostDeviceId,
        },
      },
      config,
      logger,
    );

    return {
      pairing,
    };
  });

  app.post("/api/pairings/claim", async (request) => {
    const body = claimPairingBodySchema.parse(request.body);
    assertDeviceSecret(body.deviceId, body.deviceSecret);

    const pairing = store.getPairing(body.code);
    if (!pairing) {
      throw app.httpErrors.notFound("Pairing code not found");
    }

    if (pairing.expiresAt <= nowIso()) {
      throw app.httpErrors.gone("Pairing code expired");
    }

    const claimed = await store.claimPairing(body.code, body.deviceId);
    if (!claimed) {
      throw app.httpErrors.notFound("Pairing code not found");
    }

    await store.addTrustedDevice(claimed.hostDeviceId, body.deviceId);
    await recordAuditEvent(
      {
        type: "pairing.claimed",
        payload: {
          code: claimed.code,
          hostDeviceId: claimed.hostDeviceId,
          controllerDeviceId: body.deviceId,
        },
      },
      config,
      logger,
    );

    return {
      pairing: claimed,
      host: sanitizeDevice(store.getDevice(claimed.hostDeviceId)!),
    };
  });

  app.post("/api/sessions", async (request) => {
    const body = createSessionBodySchema.parse(request.body);
    assertDeviceSecret(body.controllerDeviceId, body.controllerSecret);

    const host = store.getDevice(body.hostDeviceId);
    if (!host) {
      throw app.httpErrors.notFound("Host device not found");
    }

    const controller = store.getDevice(body.controllerDeviceId);
    if (!controller) {
      throw app.httpErrors.notFound("Controller device not found");
    }

    const session = await store.createSession({
      sessionId: randomId("sess_"),
      hostDeviceId: body.hostDeviceId,
      controllerDeviceId: body.controllerDeviceId,
      state: "pending",
      createdAt: nowIso(),
      requestedMode: body.requestedMode,
      requestedFeatures: body.requestedFeatures,
    });

    metrics.sessionRequests.inc({
      mode: session.requestedMode,
      state: "pending",
    });

    const trustedController = host.trustedDeviceIds.includes(body.controllerDeviceId);
    const shouldAutoApprove =
      session.requestedMode === "unattended" &&
      trustedController &&
      host.capabilities.unattendedAccess &&
      host.approvalMode !== "prompt";

    await recordAuditEvent(
      {
        type: "session.requested",
        payload: {
          sessionId: session.sessionId,
          hostDeviceId: session.hostDeviceId,
          controllerDeviceId: session.controllerDeviceId,
          requestedMode: session.requestedMode,
        },
      },
      config,
      logger,
    );

    if (shouldAutoApprove) {
      const approved = await approveSession(session.sessionId, body.controllerDeviceId);
      return {
        session: sanitizeSessionForDevice(approved, body.controllerDeviceId),
      };
    }

    emitToDevice(body.hostDeviceId, "session:requested", sanitizeSessionForDevice(session, body.hostDeviceId));
    await syncMetrics();

    return {
      session: sanitizeSessionForDevice(session, body.controllerDeviceId),
    };
  });

  app.post("/api/sessions/:sessionId/approve", async (request) => {
    const sessionId = z.string().parse((request.params as Record<string, string>).sessionId);
    const body = approveSessionBodySchema.parse(request.body);
    assertDeviceSecret(body.deviceId, body.deviceSecret);

    const session = store.getSession(sessionId);
    if (!session) {
      throw app.httpErrors.notFound("Session not found");
    }

    if (session.hostDeviceId !== body.deviceId) {
      throw app.httpErrors.forbidden("Only the host can approve the session");
    }

    const approved = await approveSession(sessionId, body.deviceId);
    return {
      session: sanitizeSessionForDevice(approved, body.deviceId),
    };
  });

  app.post("/api/sessions/:sessionId/reject", async (request) => {
    const sessionId = z.string().parse((request.params as Record<string, string>).sessionId);
    const body = approveSessionBodySchema.parse(request.body);
    assertDeviceSecret(body.deviceId, body.deviceSecret);

    const session = store.getSession(sessionId);
    if (!session) {
      throw app.httpErrors.notFound("Session not found");
    }

    if (session.hostDeviceId !== body.deviceId) {
      throw app.httpErrors.forbidden("Only the host can reject the session");
    }

    const rejected = await rejectSession(sessionId, body.deviceId);
    return {
      session: sanitizeSessionForDevice(rejected, body.deviceId),
    };
  });

  app.get("/api/sessions/:sessionId", async (request) => {
    const sessionId = z.string().parse((request.params as Record<string, string>).sessionId);
    const query = getSessionQuerySchema.parse(request.query);
    assertDeviceSecret(query.deviceId, query.deviceSecret);

    const session = store.getSession(sessionId);
    if (!session) {
      throw app.httpErrors.notFound("Session not found");
    }

    assertSessionMembership(query.deviceId, session);
    return {
      session: sanitizeSessionForDevice(session, query.deviceId),
    };
  });

  app.get("/api/controller-launch", async (request) => {
    const query = controllerLaunchQuerySchema.parse(request.query);
    const token = await verifySessionToken(query.token, config.sessionHmacSecret);
    const session = store.getSession(token.sessionId);

    if (!session || session.state !== "approved") {
      throw app.httpErrors.notFound("Session is not approved");
    }

    if (token.deviceId !== session.controllerDeviceId) {
      throw app.httpErrors.forbidden("Viewer token does not belong to the controller");
    }

    return {
      sessionId: session.sessionId,
      viewerToken: query.token,
      controllerDeviceId: session.controllerDeviceId,
      hostDeviceId: session.hostDeviceId,
      controlPlaneBaseUrl: config.publicBaseUrl,
    };
  });

  io.on("connection", (socket) => {
    logger.info("socket.connected", {
      socketId: socket.id,
    });

    socket.on(
      "presence:register",
      async (
        payload: unknown,
        ack?: (result: {
          ok: boolean;
          error?: string;
          deviceId?: string;
          sessionId?: string;
        }) => void,
      ) => {
        try {
          const auth = socketAuthSchema.parse(payload);

          if (auth.sessionToken) {
            const token = await verifySessionToken(auth.sessionToken, config.sessionHmacSecret);
            socket.data.deviceId = token.deviceId;
            socket.data.sessionId = token.sessionId;
            socket.data.role = token.role;
          } else {
            assertDeviceSecret(auth.deviceId!, auth.deviceSecret!);
            socket.data.deviceId = auth.deviceId;
            socket.data.role = "host";
          }

          deviceSockets.set(socket.data.deviceId, socket);
          await store.setDevicePresence(socket.data.deviceId, {
            online: true,
            connectedAt: nowIso(),
            lastSeenAt: nowIso(),
          });
          await syncMetrics();

          ack?.({
            ok: true,
            deviceId: socket.data.deviceId,
            sessionId: socket.data.sessionId,
          });
        } catch (error) {
          ack?.({
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
    );

    socket.on(
      "session:approve",
      async (
        payload: unknown,
        ack?: (result: { ok: boolean; error?: string; session?: PersistedSession }) => void,
      ) => {
        try {
          const parsed = z.object({ sessionId: z.string().min(8) }).parse(payload);
          const session = store.getSession(parsed.sessionId);
          if (!session) {
            throw app.httpErrors.notFound("Session not found");
          }

          if (session.hostDeviceId !== socket.data.deviceId) {
            throw app.httpErrors.forbidden("Only the host can approve this session");
          }

          const approved = await approveSession(parsed.sessionId, socket.data.deviceId);
          ack?.({
            ok: true,
            session: approved,
          });
        } catch (error) {
          ack?.({
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
    );

    socket.on(
      "session:reject",
      async (
        payload: unknown,
        ack?: (result: { ok: boolean; error?: string; session?: PersistedSession }) => void,
      ) => {
        try {
          const parsed = z.object({ sessionId: z.string().min(8) }).parse(payload);
          const session = store.getSession(parsed.sessionId);
          if (!session) {
            throw app.httpErrors.notFound("Session not found");
          }

          if (session.hostDeviceId !== socket.data.deviceId) {
            throw app.httpErrors.forbidden("Only the host can reject this session");
          }

          const rejected = await rejectSession(parsed.sessionId, socket.data.deviceId);
          ack?.({
            ok: true,
            session: rejected,
          });
        } catch (error) {
          ack?.({
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
    );

    socket.on("rtc:signal", (payload: unknown) => {
      try {
        const signal = rtcSignalMessageSchema.parse(payload);
        const session = store.getSession(signal.sessionId);
        if (!session) {
          throw app.httpErrors.notFound("Session not found");
        }

        assertSessionMembership(socket.data.deviceId, session);

        emitToDevice(signal.toDeviceId, "rtc:signal", signal);
      } catch (error) {
        logger.warn("rtc.signal.rejected", {
          socketId: socket.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    socket.on("session:input", (payload: unknown) => {
      try {
        const parsed = z.object({
          sessionId: z.string().min(8),
          event: remoteInputEventSchema,
        }).parse(payload);
        const session = store.getSession(parsed.sessionId);
        if (!session) {
          throw app.httpErrors.notFound("Session not found");
        }

        assertSessionMembership(socket.data.deviceId, session);
        emitToDevice(session.hostDeviceId, "session:input", parsed.event);
      } catch (error) {
        logger.warn("session.input.rejected", {
          socketId: socket.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    socket.on("session:end", async (payload: unknown) => {
      try {
        const parsed = z.object({ sessionId: z.string().min(8) }).parse(payload);
        const session = store.getSession(parsed.sessionId);
        if (!session) {
          return;
        }

        assertSessionMembership(socket.data.deviceId, session);

        const ended = await store.updateSession(parsed.sessionId, (current) => ({
          ...current,
          state: "ended",
          endedAt: nowIso(),
        }));

        if (!ended) {
          return;
        }

        emitToDevice(ended.hostDeviceId, "session:ended", {
          sessionId: ended.sessionId,
        });
        emitToDevice(ended.controllerDeviceId, "session:ended", {
          sessionId: ended.sessionId,
        });

        await syncMetrics();
      } catch (error) {
        logger.warn("session.end.rejected", {
          socketId: socket.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    socket.on("disconnect", async () => {
      const deviceId = socket.data.deviceId as string | undefined;
      if (!deviceId) {
        return;
      }

      const current = deviceSockets.get(deviceId);
      if (current?.id === socket.id) {
        deviceSockets.delete(deviceId);
        await store.setDevicePresence(deviceId, {
          online: false,
          lastSeenAt: nowIso(),
        });
        await syncMetrics();
      }
    });
  });

  const address = await app.listen({
    host: config.host,
    port: config.port,
  });

  logger.info("control-plane.started", {
    address,
    publicBaseUrl: config.publicBaseUrl,
  });
}

bootstrap().catch((error) => {
  logger.error("control-plane.crashed", {
    error: error instanceof Error ? error.stack ?? error.message : String(error),
  });
  process.exitCode = 1;
});
