import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { applyInsight, dismissInsight, InsightConfidenceTooLowError } from "@/lib/ai/optimization";

describe("self-improvement loop: applying an AI insight (real Postgres)", () => {
  let orgId: string;
  let brandId: string;

  beforeAll(async () => {
    const suffix = randomUUID().slice(0, 8);
    const org = await prisma.organization.create({ data: { name: `Test Org ${suffix}`, slug: `test-org-${suffix}` } });
    orgId = org.id;
    const brand = await prisma.brand.create({ data: { organizationId: orgId, name: "Test Brand" } });
    brandId = brand.id;
    await prisma.strategy.create({
      data: {
        brandId,
        version: 1,
        isActive: true,
        summary: "Initial strategy",
        goals: ["Grow reach"],
        weeklyThemes: ["Education"],
        recommendedFormats: ["POST"],
        recommendations: ["Post consistently"],
      },
    });
  });

  afterAll(async () => {
    await prisma.organization.delete({ where: { id: orgId } }).catch(() => {});
  });

  it("refuses to apply an insight below the confidence threshold", async () => {
    const insight = await prisma.aIInsight.create({
      data: {
        brandId,
        summary: "Low-confidence insight from a tiny sample",
        winningPatterns: [],
        losingPatterns: [],
        recommendations: ["Post more carousels"],
        experiments: [],
        confidence: 0.3,
        status: "NEW",
      },
    });

    await expect(applyInsight({ insightId: insight.id, organizationId: orgId })).rejects.toThrow(
      InsightConfidenceTooLowError
    );

    const untouched = await prisma.aIInsight.findUniqueOrThrow({ where: { id: insight.id } });
    expect(untouched.status).toBe("NEW");
  });

  it("applies a confident insight into brand memory and the active strategy, marking it APPLIED", async () => {
    const insight = await prisma.aIInsight.create({
      data: {
        brandId,
        summary: "Carousels about behind-the-scenes outperform product posts",
        winningPatterns: ["Behind-the-scenes carousels"],
        losingPatterns: ["Plain product shots"],
        recommendations: ["Post more behind-the-scenes carousels", "Reduce plain product posts"],
        experiments: ["Try a founder-story carousel"],
        confidence: 0.75,
        status: "NEW",
      },
    });

    const applied = await applyInsight({ insightId: insight.id, organizationId: orgId });
    expect(applied.status).toBe("APPLIED");

    const memoryEntries = await prisma.brandMemoryEntry.findMany({
      where: { brandId, source: "PERFORMANCE_INSIGHT" },
    });
    expect(memoryEntries.length).toBe(2);
    expect(memoryEntries.map((e) => e.insight)).toEqual(
      expect.arrayContaining(["Post more behind-the-scenes carousels", "Reduce plain product posts"])
    );
    expect(memoryEntries.every((e) => e.confidence === 0.75)).toBe(true);

    const strategy = await prisma.strategy.findFirstOrThrow({ where: { brandId, isActive: true } });
    const recs = strategy.recommendations as string[];
    expect(recs).toContain("Post more behind-the-scenes carousels");
    expect(recs).toContain("Post consistently"); // original recommendation preserved, not overwritten
  });

  it("applying an already-applied insight is idempotent", async () => {
    const insight = await prisma.aIInsight.create({
      data: {
        brandId,
        summary: "Second insight",
        winningPatterns: [],
        losingPatterns: [],
        recommendations: ["Do the thing"],
        experiments: [],
        confidence: 0.8,
        status: "APPLIED",
      },
    });

    const result = await applyInsight({ insightId: insight.id, organizationId: orgId });
    expect(result.status).toBe("APPLIED");

    const memoryEntries = await prisma.brandMemoryEntry.findMany({ where: { brandId, key: { contains: insight.id } } });
    expect(memoryEntries.length).toBe(0); // already-applied insights are not reprocessed
  });

  it("dismisses an insight without touching brand memory or strategy", async () => {
    const insight = await prisma.aIInsight.create({
      data: {
        brandId,
        summary: "Insight to dismiss",
        winningPatterns: [],
        losingPatterns: [],
        recommendations: ["Ignore me"],
        experiments: [],
        confidence: 0.9,
        status: "NEW",
      },
    });

    const dismissed = await dismissInsight(insight.id, orgId);
    expect(dismissed.status).toBe("DISMISSED");

    const memoryEntries = await prisma.brandMemoryEntry.findMany({ where: { brandId, key: { contains: insight.id } } });
    expect(memoryEntries.length).toBe(0);
  });
});
