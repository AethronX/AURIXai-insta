import "server-only";
import { prisma } from "@/lib/db";
import { externalMetricsPayloadSchema } from "@/lib/validation/analytics";
import { N8N_EVENTS } from "@/lib/n8n/events";
import { emitN8nEvent } from "@/lib/n8n/client";
import { ApiError } from "@/lib/api/response";

function engagementRate(m: { likes: number; comments: number; shares: number; saves: number; reach: number }): number {
  if (m.reach <= 0) return 0;
  return Number((((m.likes + m.comments + m.shares + m.saves) / m.reach) * 100).toFixed(2));
}

/** Normalizes and stores a metrics snapshot pushed in from n8n (which called the Instagram API
 * itself) — see docs/N8N.md Workflow 3. Never coupled to Instagram's raw response shape. */
export async function ingestExternalMetrics(rawPayload: unknown) {
  const parsed = externalMetricsPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    throw new ApiError(400, `Invalid metrics payload: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
  }
  const { contentId, metrics, source } = parsed.data;

  const content = await prisma.content.findUnique({ where: { id: contentId } });
  if (!content) throw new ApiError(404, "Content not found");

  const created = await prisma.analyticsMetric.create({
    data: {
      brandId: content.brandId,
      contentId,
      capturedAt: parsed.data.capturedAt ? new Date(parsed.data.capturedAt) : new Date(),
      likes: metrics.likes,
      comments: metrics.comments,
      shares: metrics.shares,
      saves: metrics.saves,
      reach: metrics.reach,
      impressions: metrics.impressions,
      profileVisits: metrics.profileVisits,
      followerDelta: metrics.followerDelta,
      engagementRate: engagementRate(metrics),
      source,
    },
  });

  void emitN8nEvent({
    eventType: N8N_EVENTS.ANALYTICS_UPDATED,
    payload: { brandId: content.brandId, contentId, metricId: created.id },
  }).catch(() => {});

  return { metricId: created.id };
}
