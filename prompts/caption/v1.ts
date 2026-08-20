import type { BrandContext } from "@/lib/brand/context";
import { renderBrandContext } from "@/lib/brand/context";
import { CONTENT_GUARDRAILS, jsonOnlyInstruction } from "@/prompts/shared";

export const CAPTION_PROMPT_VERSION = "caption.v1";

const SHAPE = `{
  "caption": "the full rewritten Instagram caption",
  "cta": "the call to action",
  "hashtags": [string, ...]
}`;

export function buildCaptionSystemPrompt(): string {
  return `You are AURIX, rewriting an Instagram caption for one specific brand. Keep the core
message and facts of the existing content intact — you're improving the writing, not changing
what the post is about.`;
}

export function buildCaptionUserPrompt(params: {
  brand: BrandContext;
  existingCaption: string;
  contentSummary: string;
  instruction?: string;
}): string {
  return `Brand context:\n${renderBrandContext(params.brand)}

${CONTENT_GUARDRAILS}

What this content is about: ${params.contentSummary}
Current caption: ${params.existingCaption}
Instruction: ${params.instruction ?? "Improve clarity, hook strength, and CTA while keeping the same core message."}

${jsonOnlyInstruction(SHAPE)}`;
}
