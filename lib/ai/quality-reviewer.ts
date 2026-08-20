import "server-only";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { buildBrandContext } from "@/lib/brand/context";
import { generateValidatedJSON } from "@/lib/ai/structured-output";
import { qualityReviewOutputSchema } from "@/lib/validation/ai-schemas";
import { buildReviewSystemPrompt, buildReviewUserPrompt, REVIEW_PROMPT_VERSION } from "@/prompts/review/v1";
import { recordAuditEvent } from "@/lib/observability/audit";
import { canTransition } from "@/lib/content/status";
import type { CarouselOutput } from "@/lib/validation/ai-schemas";

function summarizeContent(content: {
  title: string;
  hook: string | null;
  caption: string | null;
  cta: string | null;
  hashtags: string[];
  format: string;
  body: unknown;
}): string {
  const lines = [
    `Title: ${content.title}`,
    `Format: ${content.format}`,
    `Hook: ${content.hook ?? ""}`,
    `Caption: ${content.caption ?? ""}`,
    `CTA: ${content.cta ?? ""}`,
    `Hashtags: ${content.hashtags.join(", ")}`,
  ];
  const body = content.body as { slides?: CarouselOutput["slides"]; visualDirection?: string; assumptions?: string[] };
  if (body?.slides) {
    lines.push("Slides:");
    for (const s of body.slides) {
      lines.push(`  ${s.number}. ${s.headline} — ${s.body} (visual: ${s.visualDirection})`);
    }
  }
  if (body?.visualDirection) lines.push(`Visual direction: ${body.visualDirection}`);
  if (body?.assumptions?.length) lines.push(`Assumptions made: ${body.assumptions.join("; ")}`);
  return lines.join("\n");
}

export interface ReviewContentParams {
  contentId: string;
  organizationId: string;
}

/**
 * Runs AI quality review and routes the content's status accordingly. Passing the threshold
 * never auto-publishes — it only advances content to PENDING_APPROVAL, where a human still has
 * to approve before scheduling/publishing (see docs/AI.md — human approval is the safety gate).
 */
export async function reviewContent(params: ReviewContentParams) {
  let content = await prisma.content.findUniqueOrThrow({ where: { id: params.contentId } });
  const brand = await buildBrandContext(content.brandId);
  const threshold = getEnv().AI_QUALITY_THRESHOLD;

  if (canTransition(content.status, "AI_REVIEW")) {
    content = await prisma.content.update({ where: { id: content.id }, data: { status: "AI_REVIEW" } });
  }

  const { data, aiJobId } = await generateValidatedJSON({
    jobType: "QUALITY_REVIEW",
    task: "content",
    system: buildReviewSystemPrompt(),
    prompt: buildReviewUserPrompt({ brand, contentSummary: summarizeContent(content), threshold }),
    schema: qualityReviewOutputSchema,
    promptVersion: REVIEW_PROMPT_VERSION,
    brandId: content.brandId,
    organizationId: params.organizationId,
    maxTokens: 2000,
  });

  const outcome = data.approved && data.overallScore >= threshold ? "APPROVED" : "NEEDS_WORK";
  const nextStatus = outcome === "APPROVED" ? "PENDING_APPROVAL" : "NEEDS_EDIT";

  const [review] = await prisma.$transaction([
    prisma.qualityReview.create({
      data: {
        contentId: content.id,
        overallScore: Math.round(data.overallScore),
        scores: data.scores,
        strengths: data.strengths,
        weaknesses: data.weaknesses,
        issues: data.issues,
        recommendations: data.recommendations,
        outcome,
        promptVersion: REVIEW_PROMPT_VERSION,
        aiModel: "claude",
      },
    }),
    prisma.content.update({
      where: { id: content.id },
      data: { status: canTransition(content.status, nextStatus) ? nextStatus : content.status },
    }),
  ]);

  await recordAuditEvent({
    category: "ai",
    action: "content.reviewed",
    organizationId: params.organizationId,
    metadata: { contentId: content.id, aiJobId, overallScore: data.overallScore, outcome },
  });

  return review;
}
