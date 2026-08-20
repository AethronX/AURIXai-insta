import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/observability/logger";

export type AuditCategory = "ai" | "auth" | "publishing" | "webhook" | "analytics" | "n8n";

interface AuditEventInput {
  category: AuditCategory;
  action: string;
  organizationId?: string | null;
  actorId?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
}

/** Durable, queryable event log — the DB-backed half of observability (the other half is `logger`). */
export async function recordAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        category: input.category,
        action: input.action,
        organizationId: input.organizationId ?? null,
        actorId: input.actorId ?? null,
        requestId: input.requestId ?? null,
        metadata: (input.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });
  } catch (err) {
    // Observability must never break the primary flow.
    logger.error({ err, input }, "failed to record audit event");
  }
}
