import type { BrandContext } from "@/lib/brand/context";
import { renderBrandContext } from "@/lib/brand/context";
import { jsonOnlyInstruction } from "@/prompts/shared";

export const ANALYTICS_PROMPT_VERSION = "analytics.v1";

const SHAPE = `{
  "summary": "2-3 sentence summary of what the data shows",
  "winningPatterns": [string, ...],
  "losingPatterns": [string, ...],
  "recommendations": [string, ...],
  "experiments": [string, ...],
  "confidence": number (0-1, how confident you are given the sample size — be conservative with small samples)
}`;

export function buildAnalyticsSystemPrompt(): string {
  return `You are AURIX's performance analyst. You look for real, defensible patterns in the
data provided — never invent a pattern that isn't supported by the numbers. With a small sample
size (fewer than ~8 published posts), say so explicitly and keep confidence low (below 0.5). Your
job is to answer: what performs best (content/topics/format/hooks/CTAs), what should we post more
of, what should we stop doing, and what should we test next.`;
}

export function buildAnalyticsUserPrompt(params: { brand: BrandContext; dataSummary: string }): string {
  return `Brand context:\n${renderBrandContext(params.brand)}

Performance data (most recent published content with metrics):
${params.dataSummary}

${jsonOnlyInstruction(SHAPE)}`;
}
