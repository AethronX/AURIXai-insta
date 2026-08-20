import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withRouteErrorHandling, ApiError } from "@/lib/api/response";
import { verifyWebhookAuth, recordInboundWebhookEvent, markWebhookEventProcessed } from "@/lib/security/webhook";
import { n8nInboundEnvelopeSchema, generateRequestedPayloadSchema } from "@/lib/validation/webhooks";
import { N8N_INBOUND_EVENTS } from "@/lib/n8n/events";
import { generatePost, generateCarousel } from "@/lib/ai/content-generator";
import { logger } from "@/lib/observability/logger";

/**
 * Single inbound entrypoint for n8n -> AURIX. Every request must carry
 * `Authorization: Bearer <AURIX_WEBHOOK_SECRET>` and a body matching the envelope schema
 * (eventType, eventId, idempotencyKey, timestamp, payload). Requests are deduplicated by
 * idempotencyKey — replays return 200 without reprocessing. See docs/N8N.md for the full contract.
 */
export const POST = withRouteErrorHandling(async (request: Request) => {
  if (!verifyWebhookAuth(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const envelope = n8nInboundEnvelopeSchema.safeParse(json);
  if (!envelope.success) {
    return NextResponse.json({ ok: false, error: "Invalid envelope", issues: envelope.error.issues }, { status: 400 });
  }

  const { eventType, eventId, idempotencyKey, payload } = envelope.data;

  const { isNew, id: webhookEventId } = await recordInboundWebhookEvent({ eventType, eventId, idempotencyKey, payload });
  if (!isNew) {
    return NextResponse.json({ ok: true, data: { deduplicated: true } });
  }

  try {
    switch (eventType) {
      case N8N_INBOUND_EVENTS.CONTENT_GENERATE_REQUESTED: {
        const parsed = generateRequestedPayloadSchema.safeParse(payload);
        if (!parsed.success) throw new ApiError(400, "Invalid content.generate_requested payload");

        const brand = await prisma.brand.findUnique({ where: { id: parsed.data.brandId } });
        if (!brand) throw new ApiError(404, "Brand not found");

        const content =
          parsed.data.format === "CAROUSEL"
            ? await generateCarousel({
                brandId: brand.id,
                organizationId: brand.organizationId,
                objective: parsed.data.objective,
                contentPillarId: parsed.data.contentPillarId,
              })
            : await generatePost({
                brandId: brand.id,
                organizationId: brand.organizationId,
                objective: parsed.data.objective,
                contentPillarId: parsed.data.contentPillarId,
              });

        await markWebhookEventProcessed(webhookEventId, "PROCESSED");
        return NextResponse.json({ ok: true, data: { contentId: content.id } });
      }

      case N8N_INBOUND_EVENTS.PUBLISHING_RUN_SCHEDULED: {
        const { runDuePublishingJobs } = await import("@/lib/publishing/runner");
        const result = await runDuePublishingJobs();
        await markWebhookEventProcessed(webhookEventId, "PROCESSED");
        return NextResponse.json({ ok: true, data: result });
      }

      case N8N_INBOUND_EVENTS.ANALYTICS_METRICS_RECEIVED: {
        const { ingestExternalMetrics } = await import("@/lib/analytics/ingest");
        const result = await ingestExternalMetrics(payload);
        await markWebhookEventProcessed(webhookEventId, "PROCESSED");
        return NextResponse.json({ ok: true, data: result });
      }

      default:
        await markWebhookEventProcessed(webhookEventId, "FAILED", `Unknown event type: ${eventType}`);
        return NextResponse.json({ ok: false, error: `Unknown event type: ${eventType}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error({ err, eventType }, "n8n inbound webhook processing failed");
    await markWebhookEventProcessed(webhookEventId, "FAILED", message);
    if (err instanceof ApiError) throw err;
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
});
