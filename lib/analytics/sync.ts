import "server-only";
import { prisma } from "@/lib/db";
import { getInstagramProviderForBrand } from "@/lib/social/registry";
import { emitN8nEvent } from "@/lib/n8n/client";
import { N8N_EVENTS } from "@/lib/n8n/events";
import { recordAuditEvent } from "@/lib/observability/audit";
import { logger } from "@/lib/observability/logger";

function engagementRate(m: { likes: number; comments: number; shares: number; saves: number; reach: number }): number {
  if (m.reach <= 0) return 0;
  return Number((((m.likes + m.comments + m.shares + m.saves) / m.reach) * 100).toFixed(2));
}

export interface SyncAnalyticsResult {
  checked: number;
  updated: number;
  errors: number;
}

/**
 * AURIX-driven analytics sync — pulls fresh metrics directly via the resolved Instagram provider
 * (mock or real) for every published post with an external post id. The n8n-driven alternative
 * (docs/n8n/workflow-3-analytics-sync.md) is recommended for production since n8n already owns
 * Instagram credentials/rate-limit handling there; this path exists so analytics works out of the
 * box without n8n configured, and to demonstrate the full pipeline in mock mode.
 */
export async function syncAnalyticsForBrand(brandId: string): Promise<SyncAnalyticsResult> {
  const jobs = await prisma.publishingJob.findMany({
    where: { brandId, status: "PUBLISHED", externalPostId: { not: null } },
    include: { content: true },
  });

  void emitN8nEvent({ eventType: N8N_EVENTS.ANALYTICS_SYNC_REQUESTED, payload: { brandId } }).catch(() => {});

  const result: SyncAnalyticsResult = { checked: jobs.length, updated: 0, errors: 0 };
  const { provider } = await getInstagramProviderForBrand(brandId);

  for (const job of jobs) {
    try {
      const metrics = await provider.getAnalytics(job.externalPostId!);
      await prisma.analyticsMetric.create({
        data: {
          brandId,
          contentId: job.contentId,
          capturedAt: new Date(),
          ...metrics,
          engagementRate: engagementRate(metrics),
          source: provider.mock ? "mock" : "instagram_graph",
        },
      });
      result.updated++;
    } catch (err) {
      result.errors++;
      logger.error({ err, jobId: job.id }, "analytics sync failed for job");
    }
  }

  await recordAuditEvent({ category: "analytics", action: "analytics.synced", metadata: { brandId, ...result } });
  return result;
}
