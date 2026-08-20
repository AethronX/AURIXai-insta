import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { syncAnalyticsForBrand } from "@/lib/analytics/sync";
import { ingestExternalMetrics } from "@/lib/analytics/ingest";
import { getAnalyticsSummary } from "@/lib/analytics/service";

describe("analytics sync + ingest (real Postgres, mock Instagram provider)", () => {
  let orgId: string;
  let brandId: string;

  beforeAll(async () => {
    const suffix = randomUUID().slice(0, 8);
    const org = await prisma.organization.create({ data: { name: `Test Org ${suffix}`, slug: `test-org-${suffix}` } });
    orgId = org.id;
    const brand = await prisma.brand.create({ data: { organizationId: orgId, name: "Test Brand" } });
    brandId = brand.id;
  });

  afterAll(async () => {
    await prisma.organization.delete({ where: { id: orgId } }).catch(() => {});
  });

  it("syncAnalyticsForBrand pulls mock metrics for every published post with an external id", async () => {
    const content = await prisma.content.create({
      data: { brandId, title: "Synced post", format: "POST", platform: "INSTAGRAM", status: "PUBLISHED", body: {} },
    });
    await prisma.publishingJob.create({
      data: {
        brandId,
        contentId: content.id,
        status: "PUBLISHED",
        provider: "mock",
        scheduledFor: new Date(),
        externalPostId: `mock_${content.id}_${Date.now() - 60 * 60 * 1000}_abcdef12`,
        idempotencyKey: `test:${content.id}:${randomUUID()}`,
      },
    });

    const result = await syncAnalyticsForBrand(brandId);
    expect(result.checked).toBeGreaterThanOrEqual(1);
    expect(result.updated).toBeGreaterThanOrEqual(1);
    expect(result.errors).toBe(0);

    const metric = await prisma.analyticsMetric.findFirst({ where: { contentId: content.id } });
    expect(metric).not.toBeNull();
    expect(metric!.reach).toBeGreaterThan(0);
    expect(metric!.source).toBe("mock");
  });

  it("ingestExternalMetrics validates and stores a normalized snapshot", async () => {
    const content = await prisma.content.create({
      data: { brandId, title: "Ingested post", format: "POST", platform: "INSTAGRAM", status: "PUBLISHED", body: {} },
    });

    const { metricId } = await ingestExternalMetrics({
      contentId: content.id,
      source: "instagram_graph",
      metrics: { likes: 100, comments: 10, shares: 5, saves: 20, reach: 1000, impressions: 1200, profileVisits: 30, followerDelta: 2 },
    });

    const metric = await prisma.analyticsMetric.findUniqueOrThrow({ where: { id: metricId } });
    expect(metric.likes).toBe(100);
    expect(metric.engagementRate).toBeCloseTo(13.5, 1); // (100+10+5+20)/1000 * 100
  });

  it("ingestExternalMetrics rejects a malformed payload", async () => {
    await expect(ingestExternalMetrics({ contentId: "x" })).rejects.toThrow();
  });

  it("getAnalyticsSummary aggregates totals and a leaderboard from stored metrics", async () => {
    const summary = await getAnalyticsSummary(brandId);
    expect(summary.publishedCount).toBeGreaterThanOrEqual(1);
    expect(summary.totalReach).toBeGreaterThan(0);
    expect(Array.isArray(summary.topPerforming)).toBe(true);
  });
});
