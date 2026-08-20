import "server-only";
import { randomUUID, createHmac } from "crypto";
import { getEnv, isN8nConfigured } from "@/lib/env";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/observability/logger";
import type { N8nEventType } from "@/lib/n8n/events";

export interface EmitN8nEventParams {
  eventType: N8nEventType;
  payload: Record<string, unknown>;
  organizationId?: string;
}

export interface EmitN8nEventResult {
  sent: boolean;
  reason?: string;
}

/**
 * Sends a lifecycle event to n8n's webhook trigger. Every request carries eventType, eventId,
 * timestamp, and an idempotencyKey so the n8n workflow (and any retry) can dedupe safely, plus
 * an HMAC-SHA256 signature over the body so the workflow can verify authenticity.
 *
 * If n8n isn't configured, this is a documented no-op — never a silent failure that looks like
 * success. Callers should not treat event emission failures as fatal to the primary operation
 * (content generation/approval must succeed even if the notification to n8n fails).
 */
export async function emitN8nEvent(params: EmitN8nEventParams): Promise<EmitN8nEventResult> {
  if (!isN8nConfigured()) {
    logger.debug({ eventType: params.eventType }, "n8n not configured — skipping outbound event");
    return { sent: false, reason: "n8n not configured" };
  }

  const env = getEnv();
  const eventId = randomUUID();
  const idempotencyKey = `${params.eventType}:${eventId}`;
  const timestamp = new Date().toISOString();

  const body = JSON.stringify({
    eventType: params.eventType,
    eventId,
    idempotencyKey,
    timestamp,
    payload: params.payload,
  });

  const signature = createHmac("sha256", env.N8N_WEBHOOK_SECRET).update(body).digest("hex");

  try {
    const response = await fetch(env.N8N_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-AURIX-Signature": `sha256=${signature}`,
        "X-AURIX-Event": params.eventType,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    await prisma.webhookEvent.create({
      data: {
        direction: "OUTBOUND",
        eventType: params.eventType,
        eventId,
        idempotencyKey,
        payload: params.payload as never,
        status: response.ok ? "PROCESSED" : "FAILED",
        errorMessage: response.ok ? null : `n8n responded ${response.status}`,
        organizationId: params.organizationId,
      },
    });

    if (!response.ok) {
      logger.warn({ eventType: params.eventType, status: response.status }, "n8n webhook call failed");
      return { sent: false, reason: `n8n responded ${response.status}` };
    }
    return { sent: true };
  } catch (err) {
    logger.error({ err, eventType: params.eventType }, "n8n webhook call errored");
    await prisma.webhookEvent
      .create({
        data: {
          direction: "OUTBOUND",
          eventType: params.eventType,
          eventId,
          idempotencyKey,
          payload: params.payload as never,
          status: "FAILED",
          errorMessage: err instanceof Error ? err.message : "Unknown error",
          organizationId: params.organizationId,
        },
      })
      .catch(() => {});
    return { sent: false, reason: "network error" };
  }
}
