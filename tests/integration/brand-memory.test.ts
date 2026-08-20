import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { recordFeedbackMemory, getMemoryContext } from "@/lib/brand/memory";

describe("brand memory: feedback reinforcement (real Postgres)", () => {
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

  it("a single rejection starts below the prompt-injection confidence floor", async () => {
    await recordFeedbackMemory({ brandId, source: "REJECTION_FEEDBACK", reason: "This felt way too promotional and salesy" });

    const entries = await prisma.brandMemoryEntry.findMany({ where: { brandId, key: "tone.promotional_language" } });
    expect(entries).toHaveLength(1);
    expect(entries[0].confidence).toBeLessThan(0.5);

    // Below the injection threshold — must not appear in prompt context yet (one data point isn't
    // enough to bias every future generation).
    const context = await getMemoryContext(brandId);
    expect(context.find((c) => c.key === "tone.promotional_language")).toBeUndefined();
  });

  it("repeated feedback on the same theme reinforces confidence instead of creating duplicates", async () => {
    await recordFeedbackMemory({ brandId, source: "REJECTION_FEEDBACK", reason: "Too pushy / salesy again" });
    await recordFeedbackMemory({ brandId, source: "REJECTION_FEEDBACK", reason: "Still too promotional in tone" });

    const entries = await prisma.brandMemoryEntry.findMany({
      where: { brandId, key: "tone.promotional_language" },
      orderBy: { createdAt: "asc" },
    });
    expect(entries.length).toBe(3);
    // Confidence should be monotonically increasing across repeated feedback on the same theme.
    expect(entries[1].confidence).toBeGreaterThan(entries[0].confidence);
    expect(entries[2].confidence).toBeGreaterThan(entries[1].confidence);

    // Now above the injection floor — the strongest entry becomes visible in prompt context.
    const context = await getMemoryContext(brandId);
    const found = context.find((c) => c.key === "tone.promotional_language");
    expect(found).toBeDefined();
    expect(found!.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it("confidence never exceeds the cap regardless of how much feedback repeats", async () => {
    for (let i = 0; i < 10; i++) {
      await recordFeedbackMemory({ brandId, source: "REJECTION_FEEDBACK", reason: "too salesy, too promotional" });
    }
    const strongest = await prisma.brandMemoryEntry.findFirst({
      where: { brandId, key: "tone.promotional_language" },
      orderBy: { confidence: "desc" },
    });
    expect(strongest!.confidence).toBeLessThanOrEqual(0.95);
  });

  it("distinct feedback themes create distinct memory keys", async () => {
    await recordFeedbackMemory({ brandId, source: "REJECTION_FEEDBACK", reason: "the hook is weak, doesn't grab attention" });
    const keys = await prisma.brandMemoryEntry.findMany({ where: { brandId }, distinct: ["key"], select: { key: true } });
    expect(keys.map((k) => k.key)).toContain("hook.weak");
    expect(keys.map((k) => k.key)).toContain("tone.promotional_language");
  });
});
