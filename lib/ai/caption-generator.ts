import "server-only";
import { prisma } from "@/lib/db";
import { buildBrandContext } from "@/lib/brand/context";
import { generateValidatedJSON } from "@/lib/ai/structured-output";
import { captionOutputSchema } from "@/lib/validation/ai-schemas";
import { buildCaptionSystemPrompt, buildCaptionUserPrompt, CAPTION_PROMPT_VERSION } from "@/prompts/caption/v1";
import { recordAuditEvent } from "@/lib/observability/audit";
import { createNextVersion } from "@/lib/content/versions";

export interface RegenerateCaptionParams {
  contentId: string;
  organizationId: string;
  instruction?: string;
}

export async function regenerateCaption(params: RegenerateCaptionParams) {
  const content = await prisma.content.findUniqueOrThrow({ where: { id: params.contentId } });
  const brand = await buildBrandContext(content.brandId);

  const { data, aiJobId } = await generateValidatedJSON({
    jobType: "CAPTION_GENERATION",
    task: "fast",
    system: buildCaptionSystemPrompt(),
    prompt: buildCaptionUserPrompt({
      brand,
      existingCaption: content.caption ?? "",
      contentSummary: content.title,
      instruction: params.instruction,
    }),
    schema: captionOutputSchema,
    promptVersion: CAPTION_PROMPT_VERSION,
    brandId: content.brandId,
    organizationId: params.organizationId,
    maxTokens: 1200,
  });

  const updated = await prisma.content.update({
    where: { id: content.id },
    data: { caption: data.caption, cta: data.cta, hashtags: data.hashtags },
  });

  await createNextVersion(content.id, data, `Caption regenerated${params.instruction ? `: ${params.instruction}` : ""}`, "ai");
  await recordAuditEvent({
    category: "ai",
    action: "content.caption.regenerated",
    organizationId: params.organizationId,
    metadata: { contentId: content.id, aiJobId },
  });

  return updated;
}
