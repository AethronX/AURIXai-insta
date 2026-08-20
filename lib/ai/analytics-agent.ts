import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildBrandContext } from "@/lib/brand/context";
import { getContentPerformance } from "@/lib/analytics/service";
import { generateValidatedJSON } from "@/lib/ai/structured-output";
import { analyticsInsightOutputSchema } from "@/lib/validation/ai-schemas";
import { buildAnalyticsSystemPrompt, buildAnalyticsUserPrompt, ANALYTICS_PROMPT_VERSION } from "@/prompts/analytics/v1";
import { recordAuditEvent } from "@/lib/observability/audit";

const MIN_SAMPLE_FOR_CONFIDENT_INSIGHT = 8;

function summarizePerformance(items: Awaited<ReturnType<typeof getContentPerformance>>): string {
  if (items.length === 0) return "No published content with metrics yet.";
  return items
    .map(
      (p) =>
        `- "${p.title}" (${p.format}): reach ${p.reach}, engagement rate ${p.engagementRate}%, likes ${p.likes}, comments ${p.comments}, saves ${p.saves}`
    )
    .join("\n");
}

export interface GenerateAnalyticsInsightParams {
  brandId: string;
  organizationId: string;
}

/** Runs the AI Analytics Agent over recent performance and stores a new AIInsight. Confidence is
 * capped by sample size in the prompt itself, and this never rewrites brand rules — it only ever
 * produces a human-visible recommendation (see lib/ai/optimization.ts for how it's applied). */
export async function generateAnalyticsInsight(params: GenerateAnalyticsInsightParams) {
  const [brand, performance] = await Promise.all([
    buildBrandContext(params.brandId),
    getContentPerformance(params.brandId),
  ]);

  if (performance.length === 0) {
    throw new Error("No published content with analytics yet — publish content and sync analytics first.");
  }

  const { data, aiJobId } = await generateValidatedJSON({
    jobType: "ANALYTICS_INSIGHT",
    task: "strategy",
    system: buildAnalyticsSystemPrompt(),
    prompt: buildAnalyticsUserPrompt({ brand, dataSummary: summarizePerformance(performance) }),
    schema: analyticsInsightOutputSchema,
    promptVersion: ANALYTICS_PROMPT_VERSION,
    brandId: params.brandId,
    organizationId: params.organizationId,
    maxTokens: 2500,
  });

  // Belt-and-suspenders on top of the prompt instruction: never let a tiny sample report high confidence.
  const confidence = performance.length < MIN_SAMPLE_FOR_CONFIDENT_INSIGHT ? Math.min(data.confidence, 0.45) : data.confidence;

  const insight = await prisma.aIInsight.create({
    data: {
      brandId: params.brandId,
      summary: data.summary,
      winningPatterns: data.winningPatterns as Prisma.InputJsonValue,
      losingPatterns: data.losingPatterns as Prisma.InputJsonValue,
      recommendations: data.recommendations as Prisma.InputJsonValue,
      experiments: data.experiments as Prisma.InputJsonValue,
      confidence,
      status: "NEW",
      promptVersion: ANALYTICS_PROMPT_VERSION,
      aiModel: "claude",
    },
  });

  await recordAuditEvent({
    category: "analytics",
    action: "insight.generated",
    organizationId: params.organizationId,
    metadata: { brandId: params.brandId, insightId: insight.id, aiJobId, sampleSize: performance.length },
  });

  return insight;
}
