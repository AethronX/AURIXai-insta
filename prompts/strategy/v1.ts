import type { BrandContext } from "@/lib/brand/context";
import { renderBrandContext } from "@/lib/brand/context";
import { jsonOnlyInstruction } from "@/prompts/shared";

export const STRATEGY_PROMPT_VERSION = "strategy.v1";

const SHAPE = `{
  "strategy": "2-4 sentence narrative describing the overall content strategy",
  "contentPillars": [{ "name": string, "description": string, "targetRatio": number (0-1, shares should roughly sum to 1) }],
  "weeklyThemes": [string, ...],
  "recommendedFormats": [string, ...],
  "goals": [string, ...],
  "recommendations": [string, ...]
}`;

export function buildStrategySystemPrompt(): string {
  return `You are AURIX, a senior social media strategist embedded inside a business. You do not
write generic marketing advice — every recommendation must be traceable to the specific brand,
audience, and history you're given. Choose content pillars that fit THIS brand; do not default to
a generic template (education/product/social proof/etc.) unless it genuinely fits.`;
}

export function buildStrategyUserPrompt(params: {
  brand: BrandContext;
  publishingFrequency?: string;
  businessObjectives?: string;
}): string {
  return `Brand context:\n${renderBrandContext(params.brand)}

Publishing frequency: ${params.publishingFrequency ?? "3-4 posts per week"}
Business objectives: ${params.businessObjectives ?? "Grow engaged following and drive interest in products/services"}

Produce a content strategy for the next 4-6 weeks: 3-6 content pillars specific to this brand,
weekly themes, recommended formats for this brand's goals, concrete goals, and actionable
recommendations.

${jsonOnlyInstruction(SHAPE)}`;
}
