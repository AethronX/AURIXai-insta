import "server-only";
import { prisma } from "@/lib/db";
import { listReviewQueue, listUpcoming, countByStatus } from "@/lib/content/service";
import { getAnalyticsSummary } from "@/lib/analytics/service";

/** Everything the Overview page renders, aggregated in one place so the page stays thin. */
export async function getDashboardOverview(brandId: string, organizationId: string) {
  const [
    statusCounts,
    reviewQueue,
    upcoming,
    analyticsSummary,
    latestInsight,
    activeStrategy,
    instagramIntegration,
    recentActivity,
    failedJobs,
  ] = await Promise.all([
    countByStatus(brandId),
    listReviewQueue(brandId),
    listUpcoming(brandId),
    getAnalyticsSummary(brandId),
    prisma.aIInsight.findFirst({
      where: { brandId, status: { in: ["NEW", "ACKNOWLEDGED"] } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.strategy.findFirst({ where: { brandId, isActive: true } }),
    prisma.integration.findUnique({ where: { brandId_type: { brandId, type: "INSTAGRAM" } } }),
    prisma.auditEvent.findMany({
      where: { organizationId, category: { in: ["ai", "publishing", "analytics"] } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.publishingJob.findMany({
      where: { brandId, status: "FAILED" },
      include: { content: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  const lastAnalyticsSync = await prisma.analyticsMetric.findFirst({
    where: { brandId },
    orderBy: { capturedAt: "desc" },
    select: { capturedAt: true },
  });

  return {
    statusCounts,
    reviewQueue,
    upcoming,
    analyticsSummary,
    latestInsight,
    activeStrategy,
    instagramIntegration,
    recentActivity,
    failedJobs,
    lastAnalyticsSyncAt: lastAnalyticsSync?.capturedAt ?? null,
  };
}
