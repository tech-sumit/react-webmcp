import { z } from "zod";

export const platformValues = ["macos", "windows", "android", "ios"] as const;
export const approvalModeValues = ["prompt", "trusted-only", "always"] as const;
export const sessionStateValues = [
  "pending",
  "approved",
  "rejected",
  "connecting",
  "active",
  "ended",
] as const;
export const sessionRoleValues = ["host", "controller", "viewer-web"] as const;

export const platformSchema = z.enum(platformValues);
export const approvalModeSchema = z.enum(approvalModeValues);
export const sessionStateSchema = z.enum(sessionStateValues);
export const sessionRoleSchema = z.enum(sessionRoleValues);

export const hostCapabilitiesSchema = z.object({
  screenCapture: z.boolean(),
  pointerInjection: z.boolean(),
  keyboardInjection: z.boolean(),
  clipboardSync: z.boolean(),
  fileTransfer: z.boolean(),
  unattendedAccess: z.boolean(),
  mobileHostBeta: z.boolean(),
  iosEnterpriseOnly: z.boolean(),
});

export const devicePresenceSchema = z.object({
  online: z.boolean(),
  connectedAt: z.string().optional(),
  lastSeenAt: z.string().optional(),
});

export const deviceIdentitySchema = z.object({
  deviceId: z.string().min(8),
  deviceSecret: z.string().min(16),
  name: z.string().min(1),
  meshnetPeerId: z.string().min(1).optional(),
  platform: platformSchema,
  userAgent: z.string().optional(),
  capabilities: hostCapabilitiesSchema,
  approvalMode: approvalModeSchema,
  tags: z.array(z.string()).default([]),
});

export const registeredDeviceSchema = deviceIdentitySchema.extend({
  trustedDeviceIds: z.array(z.string()).default([]),
  presence: devicePresenceSchema.default({ online: false }),
});

export const pairingCodeSchema = z.object({
  code: z.string().min(4),
  hostDeviceId: z.string().min(8),
  expiresAt: z.string(),
  createdAt: z.string(),
  claimedByDeviceId: z.string().optional(),
});

export const sessionRequestSchema = z.object({
  sessionId: z.string().min(8),
  hostDeviceId: z.string().min(8),
  controllerDeviceId: z.string().min(8),
  state: sessionStateSchema,
  createdAt: z.string(),
  approvedAt: z.string().optional(),
  endedAt: z.string().optional(),
  requestedMode: z.enum(["attended", "unattended"]),
  requestedFeatures: z.object({
    clipboard: z.boolean().default(true),
    fileTransfer: z.boolean().default(true),
    audio: z.boolean().default(false),
  }),
});

export const sessionTokenPayloadSchema = z.object({
  sessionId: z.string().min(8),
  deviceId: z.string().min(8),
  role: sessionRoleSchema,
  iat: z.number().int().nonnegative(),
  exp: z.number().int().positive(),
});

export const rtcSignalMessageSchema = z.object({
  sessionId: z.string().min(8),
  fromDeviceId: z.string().min(8),
  toDeviceId: z.string().min(8),
  description: z
    .object({
      type: z.enum(["offer", "answer"]),
      sdp: z.string().min(1),
    })
    .optional(),
  candidate: z
    .object({
      candidate: z.string().min(1),
      sdpMid: z.string().nullable().optional(),
      sdpMLineIndex: z.number().nullable().optional(),
    })
    .optional(),
});

export const pointerMoveEventSchema = z.object({
  kind: z.literal("pointer.move"),
  normalizedX: z.number().min(0).max(1),
  normalizedY: z.number().min(0).max(1),
});

export const pointerButtonEventSchema = z.object({
  kind: z.literal("pointer.button"),
  normalizedX: z.number().min(0).max(1),
  normalizedY: z.number().min(0).max(1),
  button: z.enum(["left", "middle", "right"]),
  action: z.enum(["down", "up", "click", "double"]),
});

export const wheelEventSchema = z.object({
  kind: z.literal("pointer.wheel"),
  deltaY: z.number(),
});

export const keyboardEventSchema = z.object({
  kind: z.literal("keyboard.input"),
  key: z.string().min(1),
  code: z.string().optional(),
  action: z.enum(["down", "up", "type"]),
  text: z.string().optional(),
});

export const clipboardEventSchema = z.object({
  kind: z.literal("clipboard.text"),
  text: z.string(),
});

export const fileMetaEventSchema = z.object({
  kind: z.literal("file.meta"),
  name: z.string().min(1),
  mimeType: z.string().min(1).default("application/octet-stream"),
  size: z.number().int().nonnegative(),
});

export const fileChunkEventSchema = z.object({
  kind: z.literal("file.chunk"),
  name: z.string().min(1),
  chunk: z.string().min(1),
  index: z.number().int().nonnegative(),
  isLast: z.boolean(),
});

export const remoteInputEventSchema = z.discriminatedUnion("kind", [
  pointerMoveEventSchema,
  pointerButtonEventSchema,
  wheelEventSchema,
  keyboardEventSchema,
  clipboardEventSchema,
  fileMetaEventSchema,
  fileChunkEventSchema,
]);

export const controllerLaunchSchema = z.object({
  sessionId: z.string().min(8),
  viewerToken: z.string().min(8),
  controllerDeviceId: z.string().min(8),
  hostDeviceId: z.string().min(8),
  controlPlaneBaseUrl: z.string().url(),
});

export type Platform = z.infer<typeof platformSchema>;
export type ApprovalMode = z.infer<typeof approvalModeSchema>;
export type SessionRole = z.infer<typeof sessionRoleSchema>;
export type HostCapabilities = z.infer<typeof hostCapabilitiesSchema>;
export type DeviceIdentity = z.infer<typeof deviceIdentitySchema>;
export type RegisteredDevice = z.infer<typeof registeredDeviceSchema>;
export type PairingCode = z.infer<typeof pairingCodeSchema>;
export type SessionRequest = z.infer<typeof sessionRequestSchema>;
export type SessionTokenPayload = z.infer<typeof sessionTokenPayloadSchema>;
export type RtcSignalMessage = z.infer<typeof rtcSignalMessageSchema>;
export type RemoteInputEvent = z.infer<typeof remoteInputEventSchema>;
export type ControllerLaunch = z.infer<typeof controllerLaunchSchema>;

export function buildEmptyCapabilities(): HostCapabilities {
  return {
    screenCapture: false,
    pointerInjection: false,
    keyboardInjection: false,
    clipboardSync: false,
    fileTransfer: false,
    unattendedAccess: false,
    mobileHostBeta: false,
    iosEnterpriseOnly: false,
  };
}
