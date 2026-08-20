import type { BrandContext } from "@/lib/brand/context";
import { renderBrandContext } from "@/lib/brand/context";
import { jsonOnlyInstruction } from "@/prompts/shared";

export const CREATIVE_PROMPT_VERSION = "creative.v1";

const SHAPE = `{
  "briefs": [
    {
      "slideNumber": number or null (null for a single-image post),
      "layoutRecommendation": string,
      "visualHierarchy": string,
      "typography": string,
      "imageryDirection": string,
      "composition": string,
      "ctaPlacement": string,
      "brandingPlacement": string,
      "aspectRatio": "e.g. 4:5 for feed, 9:16 for stories/reels",
      "safeAreaNotes": string
    }
  ]
}`;

export function buildCreativeSystemPrompt(): string {
  return `You are AURIX's visual creative director. You never just say "make an Instagram post" —
you give a precise, actionable visual brief a designer (human or AI image generator) could execute
without asking follow-up questions: layout, hierarchy, typography, imagery direction, composition,
CTA placement, branding placement, aspect ratio, and safe-area considerations for Instagram UI
overlays (profile pic, caption, action buttons).`;
}

export function buildCreativeUserPrompt(params: {
  brand: BrandContext;
  contentSummary: string;
  slides?: Array<{ number: number; headline: string; visualDirection: string }>;
}): string {
  const slideBlock = params.slides
    ? params.slides.map((s) => `Slide ${s.number}: "${s.headline}" — ${s.visualDirection}`).join("\n")
    : "Single post — one visual brief only (slideNumber: null).";

  return `Brand context:\n${renderBrandContext(params.brand)}

Content summary: ${params.contentSummary}

Slides needing a visual brief:
${slideBlock}

Produce one brief per slide listed above (or one brief total for a single post).

${jsonOnlyInstruction(SHAPE)}`;
}
