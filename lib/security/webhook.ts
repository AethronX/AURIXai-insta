import "server-only";
import { getEnv } from "@/lib/env";
import { timingSafeEqualStrings } from "@/lib/security/crypto";
import { prisma } from "@/lib/db";

/** Verifies the shared-secret bearer token n8n must send on every inbound webhook call. */
export function verifyWebhookAuth(request: Request): boolean {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return false;
  return timingSafeEqualStrings(token, getEnv().AURIX_WEBHOOK_SECRET);
}

/**
 * Ensures a webhook event is processed exactly once. Returns `{ isNew: false }` if this
 * `idempotencyKey` was already recorded — callers should short-circuit and return 200 without
 * reprocessing side effects.
 */
export async function recordInboundWebhookEvent(params: {
  eventType: string;
  eventId: string;
  idempotencyKey: string;
  payload: unknown;
  organizationId?: string | null;
}): Promise<{ isNew: boolean; id: string }> {
  const existing = await prisma.webhookEvent.findUnique({
    where: { idempotencyKey: params.idempotencyKey },
  });
  if (existing) {
    return { isNew: false, id: existing.id };
  }

  const created = await prisma.webhookEvent.create({
    data: {
      direction: "INBOUND",
      eventType: params.eventType,
      eventId: params.eventId,
      idempotencyKey: params.idempotencyKey,
      payload: params.payload as never,
      organizationId: params.organizationId ?? null,
      status: "RECEIVED",
    },
  });
  return { isNew: true, id: created.id };
}

export async function markWebhookEventProcessed(id: string, status: "PROCESSED" | "FAILED", errorMessage?: string) {
  await prisma.webhookEvent.update({
    where: { id },
    data: { status, errorMessage },
  });
}
