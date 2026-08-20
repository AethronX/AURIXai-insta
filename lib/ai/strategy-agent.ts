import "server-only";
import { prisma } from "@/lib/db";
import { buildBrandContext } from "@/lib/brand/context";
import { generateValidatedJSON } from "@/lib/ai/structured-output";
import { strategyOutputSchema } from "@/lib/validation/ai-schemas";
import { buildStrategySystemPrompt, buildStrategyUserPrompt, STRATEGY_PROMPT_VERSION } from "@/prompts/strategy/v1";
import { recordAuditEvent } from "@/lib/observability/audit";

export interface GenerateStrategyParams {
  brandId: string;
  organizationId: string;
  publishingFrequency?: string;
  businessObjectives?: string;
}

/** Generates a new content strategy, deactivates the previous one, and creates its content pillars. */
export async function generateStrategy(params: GenerateStrategyParams) {
  const brand = await buildBrandContext(params.brandId);

  const { data, aiJobId } = await generateValidatedJSON({
    jobType: "STRATEGY",
    task: "strategy",
    system: buildStrategySystemPrompt(),
    prompt: buildStrategyUserPrompt({
      brand,
      publishingFrequency: params.publishingFrequency,
      businessObjectives: params.businessObjectives,
    }),
    schema: strategyOutputSchema,
    promptVersion: STRATEGY_PROMPT_VERSION,
    brandId: params.brandId,
    organizationId: params.organizationId,
    maxTokens: 3000,
  });

  const previousVersion = await prisma.strategy.findFirst({
    where: { brandId: params.brandId },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  const strategy = await prisma.$transaction(async (tx) => {
    await tx.strategy.updateMany({ where: { brandId: params.brandId, isActive: true }, data: { isActive: false } });

    const created = await tx.strategy.create({
      data: {
        brandId: params.brandId,
        version: (previousVersion?.version ?? 0) + 1,
        isActive: true,
        summary: data.strategy,
        goals: data.goals,
        weeklyThemes: data.weeklyThemes,
        recommendedFormats: data.recommendedFormats,
        recommendations: data.recommendations,
        aiModel: "claude",
        promptVersion: STRATEGY_PROMPT_VERSION,
      },
    });

    await tx.contentPillar.createMany({
      data: data.contentPillars.map((p) => ({
        brandId: params.brandId,
        strategyId: created.id,
        name: p.name,
        description: p.description,
        targetRatio: p.targetRatio,
      })),
    });

    return created;
  });

  await recordAuditEvent({
    category: "ai",
    action: "strategy.generated",
    organizationId: params.organizationId,
    metadata: { brandId: params.brandId, strategyId: strategy.id, aiJobId },
  });

  return prisma.strategy.findUniqueOrThrow({ where: { id: strategy.id }, include: { contentPillars: true } });
}
