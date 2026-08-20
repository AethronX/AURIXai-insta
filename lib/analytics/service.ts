import "server-only";
import { prisma } from "@/lib/db";

export interface ContentPerformance {
  contentId: string;
  title: string;
  format: string;
  publishedAt: Date | null;
  reach: number;
  engagementRate: number;
  likes: number;
  comments: number;
  saves: number;
}

/** Latest metric snapshot per published content, used for leaderboards and the AI insight prompt. */
export async function getContentPerformance(brandId: string): Promise<ContentPerformance[]> {
  const content = await prisma.content.findMany({
    where: { brandId, status: "PUBLISHED" },
    include: {
      analyticsMetrics: { orderBy: { capturedAt: "desc" }, take: 1 },
      publishingJobs: { where: { status: "PUBLISHED" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return content
    .filter((c) => c.analyticsMetrics.length > 0)
    .map((c) => {
      const m = c.analyticsMetrics[0];
      return {
        contentId: c.id,
        title: c.title,
        format: c.format,
        publishedAt: c.publishingJobs[0]?.updatedAt ?? null,
        reach: m.reach,
        engagementRate: m.engagementRate,
        likes: m.likes,
        comments: m.comments,
        saves: m.saves,
      };
    });
}

export interface AnalyticsSummary {
  totalReach: number;
  totalImpressions: number;
  totalEngagements: number;
  avgEngagementRate: number;
  publishedCount: number;
  timeSeries: Array<{ date: string; reach: number; engagementRate: number }>;
  topPerforming: ContentPerformance[];
  lowPerforming: ContentPerformance[];
}

export async function getAnalyticsSummary(brandId: string): Promise<AnalyticsSummary> {
  const performance = await getContentPerformance(brandId);

  const metrics = await prisma.analyticsMetric.findMany({
    where: { brandId },
    orderBy: { capturedAt: "asc" },
  });

  const totalReach = metrics.reduce((s, m) => s + m.reach, 0);
  const totalImpressions = metrics.reduce((s, m) => s + m.impressions, 0);
  const totalEngagements = metrics.reduce((s, m) => s + m.likes + m.comments + m.shares + m.saves, 0);
  const avgEngagementRate = metrics.length ? metrics.reduce((s, m) => s + m.engagementRate, 0) / metrics.length : 0;

  const byDay = new Map<string, { reach: number; engagementRate: number; count: number }>();
  for (const m of metrics) {
    const day = m.capturedAt.toISOString().slice(0, 10);
    const existing = byDay.get(day) ?? { reach: 0, engagementRate: 0, count: 0 };
    existing.reach += m.reach;
    existing.engagementRate += m.engagementRate;
    existing.count += 1;
    byDay.set(day, existing);
  }
  const timeSeries = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, reach: v.reach, engagementRate: Number((v.engagementRate / v.count).toFixed(2)) }));

  const sorted = [...performance].sort((a, b) => b.engagementRate - a.engagementRate);

  return {
    totalReach,
    totalImpressions,
    totalEngagements,
    avgEngagementRate: Number(avgEngagementRate.toFixed(2)),
    publishedCount: performance.length,
    timeSeries,
    topPerforming: sorted.slice(0, 5),
    lowPerforming: sorted.slice(-5).reverse(),
  };
}

export async function getInsights(brandId: string) {
  return prisma.aIInsight.findMany({ where: { brandId }, orderBy: { createdAt: "desc" }, take: 10 });
}
