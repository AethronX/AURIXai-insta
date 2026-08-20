import "server-only";
import { prisma } from "@/lib/db";
import { buildBrandContext } from "@/lib/brand/context";
import { generateValidatedJSON } from "@/lib/ai/structured-output";
import { creativeBriefSchema } from "@/lib/validation/ai-schemas";
import { buildCreativeSystemPrompt, buildCreativeUserPrompt, CREATIVE_PROMPT_VERSION } from "@/prompts/creative/v1";
import { recordAuditEvent } from "@/lib/observability/audit";
import type { CarouselOutput } from "@/lib/validation/ai-schemas";

export interface GenerateCreativeBriefParams {
  contentId: string;
  organizationId: string;
}

/** Generates a precise visual brief per slide (or one for a single post) and stores them as DESIGN_BRIEF assets. */
export async function generateCreativeBrief(params: GenerateCreativeBriefParams) {
  const content = await prisma.content.findUniqueOrThrow({ where: { id: params.contentId } });
  const brand = await buildBrandContext(content.brandId);

  const body = content.body as unknown as { slides?: CarouselOutput["slides"] };
  const slides = content.format === "CAROUSEL" && body?.slides ? body.slides.map((s) => ({ number: s.number, headline: s.headline, visualDirection: s.visualDirection })) : undefined;

  const { data, aiJobId } = await generateValidatedJSON({
    jobType: "CREATIVE_DIRECTION",
    task: "fast",
    system: buildCreativeSystemPrompt(),
    prompt: buildCreativeUserPrompt({ brand, contentSummary: `${content.title} — ${content.hook ?? ""}`, slides }),
    schema: creativeBriefSchema,
    promptVersion: CREATIVE_PROMPT_VERSION,
    brandId: content.brandId,
    organizationId: params.organizationId,
    maxTokens: 3000,
  });

  await prisma.contentAsset.deleteMany({ where: { contentId: content.id, type: "DESIGN_BRIEF" } });

  const assets = await prisma.$transaction(
    data.briefs.map((brief) =>
      prisma.contentAsset.create({
        data: {
          contentId: content.id,
          slideNumber: brief.slideNumber,
          type: "DESIGN_BRIEF",
          provider: "MOCK",
          visualBrief: brief,
        },
      })
    )
  );

  await recordAuditEvent({
    category: "ai",
    action: "content.creative_brief.generated",
    organizationId: params.organizationId,
    metadata: { contentId: content.id, aiJobId, briefCount: assets.length },
  });

  return assets;
}
