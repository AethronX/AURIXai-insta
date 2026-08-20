"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/auth";
import { getPrimaryBrand } from "@/lib/brand/service";
import { generateStrategy } from "@/lib/ai/strategy-agent";
import { generatePost, generateCarousel } from "@/lib/ai/content-generator";
import { regenerateCaption } from "@/lib/ai/caption-generator";
import { generateCreativeBrief } from "@/lib/ai/creative-director";
import { generateImagesFromBriefs } from "@/lib/ai/image-generator";
import { reviewContent } from "@/lib/ai/quality-reviewer";
import { AIGenerationError } from "@/lib/ai/structured-output";
import type { ContentFormat } from "@prisma/client";

export interface ActionResult {
  ok: boolean;
  error?: string;
  contentId?: string;
}

async function requireBrand() {
  const user = await requireUser();
  const brand = await getPrimaryBrand(user.organizationId);
  if (!brand) throw new Error("No brand found. Complete onboarding first.");
  return { user, brand };
}

function toErrorResult(err: unknown): ActionResult {
  if (err instanceof AIGenerationError) {
    return { ok: false, error: err.message };
  }
  if (err instanceof Error) {
    return { ok: false, error: err.message };
  }
  return { ok: false, error: "Something went wrong generating content." };
}

export async function generateStrategyAction(input: {
  publishingFrequency?: string;
  businessObjectives?: string;
}): Promise<ActionResult> {
  try {
    const { user, brand } = await requireBrand();
    await generateStrategy({
      brandId: brand.id,
      organizationId: user.organizationId,
      publishingFrequency: input.publishingFrequency,
      businessObjectives: input.businessObjectives,
    });
    revalidatePath("/strategy");
    return { ok: true };
  } catch (err) {
    return toErrorResult(err);
  }
}

export async function generatePostAction(input: {
  objective: string;
  contentPillarId?: string;
  format?: Extract<ContentFormat, "POST" | "REEL" | "STORY">;
}): Promise<ActionResult> {
  try {
    const { user, brand } = await requireBrand();
    const content = await generatePost({
      brandId: brand.id,
      organizationId: user.organizationId,
      objective: input.objective,
      contentPillarId: input.contentPillarId,
      format: input.format,
    });
    revalidatePath("/content");
    revalidatePath("/calendar");
    return { ok: true, contentId: content.id };
  } catch (err) {
    return toErrorResult(err);
  }
}

export async function generateCarouselAction(input: {
  objective: string;
  contentPillarId?: string;
}): Promise<ActionResult> {
  try {
    const { user, brand } = await requireBrand();
    const content = await generateCarousel({
      brandId: brand.id,
      organizationId: user.organizationId,
      objective: input.objective,
      contentPillarId: input.contentPillarId,
    });
    revalidatePath("/content");
    revalidatePath("/calendar");
    return { ok: true, contentId: content.id };
  } catch (err) {
    return toErrorResult(err);
  }
}

export async function regenerateCaptionAction(contentId: string, instruction?: string): Promise<ActionResult> {
  try {
    const { user } = await requireBrand();
    await regenerateCaption({ contentId, organizationId: user.organizationId, instruction });
    revalidatePath(`/content/${contentId}`);
    return { ok: true, contentId };
  } catch (err) {
    return toErrorResult(err);
  }
}

export async function generateCreativeBriefAction(contentId: string): Promise<ActionResult> {
  try {
    const { user } = await requireBrand();
    await generateCreativeBrief({ contentId, organizationId: user.organizationId });
    revalidatePath(`/content/${contentId}`);
    return { ok: true, contentId };
  } catch (err) {
    return toErrorResult(err);
  }
}

export async function generateImagesAction(contentId: string): Promise<ActionResult> {
  try {
    const { user } = await requireBrand();
    await generateImagesFromBriefs({ contentId, organizationId: user.organizationId });
    revalidatePath(`/content/${contentId}`);
    return { ok: true, contentId };
  } catch (err) {
    return toErrorResult(err);
  }
}

export async function reviewContentAction(contentId: string): Promise<ActionResult> {
  try {
    const { user } = await requireBrand();
    await reviewContent({ contentId, organizationId: user.organizationId });
    revalidatePath(`/content/${contentId}`);
    revalidatePath("/content");
    return { ok: true, contentId };
  } catch (err) {
    return toErrorResult(err);
  }
}
