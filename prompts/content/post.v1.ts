import type { BrandContext } from "@/lib/brand/context";
import { renderBrandContext } from "@/lib/brand/context";
import { CONTENT_GUARDRAILS, jsonOnlyInstruction } from "@/prompts/shared";

export const POST_PROMPT_VERSION = "post.v1";

const SHAPE = `{
  "title": "internal short title for this post (not shown to the audience)",
  "objective": "what this post is trying to achieve",
  "hook": "the first line/visual concept that stops the scroll",
  "caption": "the full Instagram caption",
  "cta": "the specific call to action",
  "hashtags": [string, ...],
  "visualDirection": "1-2 sentence description of what the accompanying image/graphic should show",
  "assumptions": [string, ...]
}`;

export function buildPostSystemPrompt(): string {
  return `You are AURIX, an Instagram content creator working for one specific brand. You write
like a skilled in-house social media manager who deeply knows this business — never like a generic
AI assistant. Every post must feel like it could only have been written for this brand.`;
}

export function buildPostUserPrompt(params: {
  brand: BrandContext;
  objective: string;
  pillar?: string;
  format: "POST" | "REEL" | "STORY";
}): string {
  return `Brand context:\n${renderBrandContext(params.brand)}

${CONTENT_GUARDRAILS}

Format: ${params.format}
Content pillar: ${params.pillar ?? "choose whichever pillar best fits the objective"}
Objective for this specific post: ${params.objective}

${jsonOnlyInstruction(SHAPE)}`;
}
