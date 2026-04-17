import type { ControlPlaneConfig } from "../config.js";
import type { Logger } from "../logger.js";

interface AuditEvent {
  type: string;
  payload: Record<string, unknown>;
}

async function mirrorToVault(
  event: AuditEvent,
  config: ControlPlaneConfig,
  logger: Logger,
): Promise<void> {
  if (!config.vaultAddr || !config.vaultToken) {
    return;
  }

  try {
    const response = await fetch(
      `${config.vaultAddr.replace(/\/$/, "")}/v1/${config.vaultSessionAuditPath}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Vault-Token": config.vaultToken,
        },
        body: JSON.stringify({
          data: {
            ...event,
            mirroredAt: new Date().toISOString(),
          },
        }),
      },
    );

    if (!response.ok) {
      logger.warn("Failed to mirror audit event into Vault", {
        type: event.type,
        status: response.status,
      });
    }
  } catch (error) {
    logger.warn("Vault audit mirror failed", {
      type: event.type,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function mirrorToN8n(
  event: AuditEvent,
  config: ControlPlaneConfig,
  logger: Logger,
): Promise<void> {
  if (!config.n8nAuditWebhookUrl) {
    return;
  }

  try {
    const response = await fetch(config.n8nAuditWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      logger.warn("Failed to post audit event into n8n", {
        type: event.type,
        status: response.status,
      });
    }
  } catch (error) {
    logger.warn("n8n audit mirror failed", {
      type: event.type,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function recordAuditEvent(
  event: AuditEvent,
  config: ControlPlaneConfig,
  logger: Logger,
): Promise<void> {
  logger.info("audit.event", {
    auditType: event.type,
    ...event.payload,
  });

  await Promise.allSettled([mirrorToVault(event, config, logger), mirrorToN8n(event, config, logger)]);
}
