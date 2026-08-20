import type { BrandContext } from "@/lib/brand/context";
import { renderBrandContext } from "@/lib/brand/context";
import { jsonOnlyInstruction } from "@/prompts/shared";

export const REVIEW_PROMPT_VERSION = "review.v1";

const SHAPE = `{
  "overallScore": number (0-100),
  "scores": {
    "hook": number (0-100), "clarity": number (0-100), "value": number (0-100),
    "brandFit": number (0-100), "audienceFit": number (0-100), "originality": number (0-100),
    "cta": number (0-100), "visualDirection": number (0-100), "accuracy": number (0-100),
    "platformFit": number (0-100)
  },
  "strengths": [string, ...],
  "weaknesses": [string, ...],
  "issues": [string, ...],
  "recommendations": [string, ...],
  "approved": boolean
}`;

export function buildReviewSystemPrompt(): string {
  return `You are AURIX's quality reviewer — a skeptical, detail-oriented editor, not a cheerleader.
Score honestly against the brand's actual standards, not generic best practice. "accuracy" must be
scored low if the content makes any claim not grounded in the brand context provided. Set
"approved" to true only if overallScore would reasonably clear a high bar (85+) AND there are no
"issues" that a human would consider blocking.`;
}

export function buildReviewUserPrompt(params: {
  brand: BrandContext;
  contentSummary: string;
  threshold: number;
}): string {
  return `Brand context:\n${renderBrandContext(params.brand)}

Content to review:
${params.contentSummary}

Approval threshold for this brand: ${params.threshold}/100.

${jsonOnlyInstruction(SHAPE)}`;
}
