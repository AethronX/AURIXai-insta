import "server-only";
import { prisma } from "@/lib/db";
import { recordAuditEvent } from "@/lib/observability/audit";

/** Below this confidence, an insight can still be read but cannot be "applied" — it's directional
 * only. Matches the floor used for surfacing brand-memory entries into prompt context. */
export const MIN_CONFIDENCE_TO_APPLY = 0.5;

export class InsightConfidenceTooLowError extends Error {
  constructor(confidence: number) {
    super(
      `This insight's confidence (${Math.round(confidence * 100)}%) is below the ${Math.round(
        MIN_CONFIDENCE_TO_APPLY * 100
      )}% threshold to apply automatically. Read it as directional input, or generate more data first.`
    );
    this.name = "InsightConfidenceTooLowError";
  }
}

export interface ApplyInsightParams {
  insightId: string;
  organizationId: string;
}

/**
 * Human-triggered only — nothing in this codebase calls this automatically. Turns an
 * AI-generated insight into durable brand memory (so future generation prompts see it) and
 * appends its recommendations to the active strategy, so "what we learned" becomes visible in
 * both places a human would look. This is the one deliberate seam where analytics feeds back
 * into content generation — see docs/AI.md § self-improvement loop.
 */
export async function applyInsight(params: ApplyInsightParams) {
  const insight = await prisma.aIInsight.findUniqueOrThrow({ where: { id: params.insightId } });

  if (insight.confidence < MIN_CONFIDENCE_TO_APPLY) {
    throw new InsightConfidenceTooLowError(insight.confidence);
  }
  if (insight.status === "APPLIED") {
    return insight;
  }

  const recommendations = insight.recommendations as string[];

  await prisma.$transaction(async (tx) => {
    for (const [i, rec] of recommendations.entries()) {
      await tx.brandMemoryEntry.create({
        data: {
          brandId: insight.brandId,
          source: "PERFORMANCE_INSIGHT",
          key: `performance.insight.${insight.id}.${i}`,
          insight: rec,
          confidence: insight.confidence,
        },
      });
    }

    const activeStrategy = await tx.strategy.findFirst({ where: { brandId: insight.brandId, isActive: true } });
    if (activeStrategy) {
      const existing = activeStrategy.recommendations as string[];
      await tx.strategy.update({
        where: { id: activeStrategy.id },
        data: { recommendations: [...existing, ...recommendations] },
      });
    }

    await tx.aIInsight.update({ where: { id: insight.id }, data: { status: "APPLIED" } });
  });

  await recordAuditEvent({
    category: "ai",
    action: "insight.applied",
    organizationId: params.organizationId,
    metadata: { insightId: insight.id, brandId: insight.brandId, confidence: insight.confidence, recommendationCount: recommendations.length },
  });

  return prisma.aIInsight.findUniqueOrThrow({ where: { id: insight.id } });
}

export async function dismissInsight(insightId: string, organizationId: string) {
  const insight = await prisma.aIInsight.update({ where: { id: insightId }, data: { status: "DISMISSED" } });
  await recordAuditEvent({ category: "ai", action: "insight.dismissed", organizationId, metadata: { insightId } });
  return insight;
}

export async function acknowledgeInsight(insightId: string) {
  return prisma.aIInsight.updateMany({
    where: { id: insightId, status: "NEW" },
    data: { status: "ACKNOWLEDGED" },
  });
}
