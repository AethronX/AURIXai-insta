import { requireBrandOrRedirect } from "@/lib/brand/service";
import { prisma } from "@/lib/db";
import { GenerateStrategyForm } from "@/components/strategy/generate-strategy-form";
import { StrategyView } from "@/components/strategy/strategy-view";

export default async function StrategyPage() {
  const { brand } = await requireBrandOrRedirect();
  const strategy = await prisma.strategy.findFirst({
    where: { brandId: brand.id, isActive: true },
    include: { contentPillars: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">AI Strategy</h1>
        <p className="mt-1 text-sm text-muted">
          The plan AURIX uses to decide what to create for {brand.name} — content pillars, themes,
          and recommendations, refined over time by applied insights.
        </p>
      </div>

      <GenerateStrategyForm hasStrategy={Boolean(strategy)} />

      {strategy && (
        <StrategyView
          strategy={{
            version: strategy.version,
            summary: strategy.summary,
            goals: strategy.goals,
            weeklyThemes: strategy.weeklyThemes as string[],
            recommendedFormats: strategy.recommendedFormats,
            recommendations: strategy.recommendations as string[],
            contentPillars: strategy.contentPillars.map((p) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              targetRatio: p.targetRatio,
            })),
          }}
        />
      )}
    </div>
  );
}
