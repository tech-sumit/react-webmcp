import { fileURLToPath } from "node:url";
import path from "node:path";

import dotenv from "dotenv";
import { z } from "zod";

const projectRoot = fileURLToPath(new URL("../../../", import.meta.url));
const envFile = path.join(projectRoot, ".env");

dotenv.config({ path: envFile, override: false });

const envSchema = z.object({
  CONTROL_PLANE_HOST: z.string().default("0.0.0.0"),
  CONTROL_PLANE_PORT: z.coerce.number().int().positive().default(8789),
  CONTROL_PLANE_PUBLIC_BASE_URL: z.string().url().default("http://127.0.0.1:8789"),
  CONTROL_PLANE_STATE_FILE: z.string().default("./services/control-plane/state/control-plane.json"),
  CONTROL_PLANE_LOG_FILE: z.string().default("./services/control-plane/runtime/control-plane.log"),
  SESSION_HMAC_SECRET: z.string().min(16),
  PAIRING_CODE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  SESSION_REQUEST_TTL_SECONDS: z.coerce.number().int().positive().default(120),
  SESSION_MAX_FILE_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),
  VAULT_ADDR: z.string().optional(),
  VAULT_TOKEN: z.string().optional(),
  VAULT_SESSION_AUDIT_PATH: z.string().default("secret/nord-meshnet-remote-desktop/audit"),
  N8N_AUDIT_WEBHOOK_URL: z.string().url().optional(),
});

const parsed = envSchema.parse(process.env);

function resolveProjectPath(value: string): string {
  if (path.isAbsolute(value)) {
    return value;
  }

  return path.resolve(projectRoot, value);
}

export const config = {
  projectRoot,
  host: parsed.CONTROL_PLANE_HOST,
  port: parsed.CONTROL_PLANE_PORT,
  publicBaseUrl: parsed.CONTROL_PLANE_PUBLIC_BASE_URL,
  stateFile: resolveProjectPath(parsed.CONTROL_PLANE_STATE_FILE),
  logFile: resolveProjectPath(parsed.CONTROL_PLANE_LOG_FILE),
  sessionHmacSecret: parsed.SESSION_HMAC_SECRET,
  pairingCodeTtlSeconds: parsed.PAIRING_CODE_TTL_SECONDS,
  sessionRequestTtlSeconds: parsed.SESSION_REQUEST_TTL_SECONDS,
  sessionMaxFileBytes: parsed.SESSION_MAX_FILE_BYTES,
  vaultAddr: parsed.VAULT_ADDR,
  vaultToken: parsed.VAULT_TOKEN,
  vaultSessionAuditPath: parsed.VAULT_SESSION_AUDIT_PATH,
  n8nAuditWebhookUrl: parsed.N8N_AUDIT_WEBHOOK_URL,
  publicDir: path.join(projectRoot, "services/control-plane/public"),
} as const;

export type ControlPlaneConfig = typeof config;
