import "server-only";
import { prisma } from "@/lib/db";
import { buildBrandContext } from "@/lib/brand/context";
import { generateValidatedJSON } from "@/lib/ai/structured-output";
import { postOutputSchema, carouselOutputSchema } from "@/lib/validation/ai-schemas";
import { buildPostSystemPrompt, buildPostUserPrompt, POST_PROMPT_VERSION } from "@/prompts/content/post.v1";
import { buildCarouselSystemPrompt, buildCarouselUserPrompt, CAROUSEL_PROMPT_VERSION } from "@/prompts/carousel/v1";
import { recordAuditEvent } from "@/lib/observability/audit";
import { createNextVersion } from "@/lib/content/versions";
import type { ContentFormat } from "@prisma/client";

export interface GeneratePostParams {
  brandId: string;
  organizationId: string;
  objective: string;
  contentPillarId?: string;
  format?: Extract<ContentFormat, "POST" | "REEL" | "STORY">;
}

export async function generatePost(params: GeneratePostParams) {
  const brand = await buildBrandContext(params.brandId);
  const pillar = params.contentPillarId
    ? await prisma.contentPillar.findUnique({ where: { id: params.contentPillarId } })
    : null;

  const { data, aiJobId } = await generateValidatedJSON({
    jobType: "CONTENT_GENERATION",
    task: "content",
    system: buildPostSystemPrompt(),
    prompt: buildPostUserPrompt({
      brand,
      objective: params.objective,
      pillar: pillar?.name,
      format: params.format ?? "POST",
    }),
    schema: postOutputSchema,
    promptVersion: POST_PROMPT_VERSION,
    brandId: params.brandId,
    organizationId: params.organizationId,
    maxTokens: 2000,
  });

  const content = await prisma.content.create({
    data: {
      brandId: params.brandId,
      contentPillarId: params.contentPillarId,
      title: data.title,
      objective: data.objective,
      format: params.format ?? "POST",
      platform: "INSTAGRAM",
      status: "DRAFT",
      hook: data.hook,
      caption: data.caption,
      cta: data.cta,
      hashtags: data.hashtags,
      body: { visualDirection: data.visualDirection, assumptions: data.assumptions },
      promptVersion: POST_PROMPT_VERSION,
      aiModel: "claude",
    },
  });

  await createNextVersion(content.id, data, "Initial AI generation", "ai");
  await recordAuditEvent({
    category: "ai",
    action: "content.post.generated",
    organizationId: params.organizationId,
    metadata: { brandId: params.brandId, contentId: content.id, aiJobId },
  });

  return content;
}

export interface GenerateCarouselParams {
  brandId: string;
  organizationId: string;
  objective: string;
  contentPillarId?: string;
}

export async function generateCarousel(params: GenerateCarouselParams) {
  const brand = await buildBrandContext(params.brandId);
  const pillar = params.contentPillarId
    ? await prisma.contentPillar.findUnique({ where: { id: params.contentPillarId } })
    : null;

  const { data, aiJobId } = await generateValidatedJSON({
    jobType: "CAROUSEL_GENERATION",
    task: "content",
    system: buildCarouselSystemPrompt(),
    prompt: buildCarouselUserPrompt({ brand, objective: params.objective, pillar: pillar?.name }),
    schema: carouselOutputSchema,
    promptVersion: CAROUSEL_PROMPT_VERSION,
    brandId: params.brandId,
    organizationId: params.organizationId,
    maxTokens: 4000,
  });

  const content = await prisma.content.create({
    data: {
      brandId: params.brandId,
      contentPillarId: params.contentPillarId,
      title: data.title,
      objective: data.objective,
      format: "CAROUSEL",
      platform: "INSTAGRAM",
      status: "DRAFT",
      hook: data.hook,
      caption: data.caption,
      cta: data.cta,
      hashtags: data.hashtags,
      body: { slides: data.slides, assumptions: data.assumptions },
      promptVersion: CAROUSEL_PROMPT_VERSION,
      aiModel: "claude",
    },
  });

  await createNextVersion(content.id, data, "Initial AI generation", "ai");
  await recordAuditEvent({
    category: "ai",
    action: "content.carousel.generated",
    organizationId: params.organizationId,
    metadata: { brandId: params.brandId, contentId: content.id, aiJobId },
  });

  return content;
}
