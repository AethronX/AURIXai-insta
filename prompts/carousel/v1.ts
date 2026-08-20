import type { BrandContext } from "@/lib/brand/context";
import { renderBrandContext } from "@/lib/brand/context";
import { CONTENT_GUARDRAILS, jsonOnlyInstruction } from "@/prompts/shared";

export const CAROUSEL_PROMPT_VERSION = "carousel.v1";

const SHAPE = `{
  "title": "internal short title (not shown to the audience)",
  "objective": "what this carousel is trying to achieve",
  "hook": "the slide-1 hook concept",
  "slides": [
    {
      "number": 1,
      "headline": "short punchy headline for this slide",
      "body": "supporting text for this slide (keep tight — one idea per slide)",
      "purpose": "e.g. hook | context | point | proof | cta",
      "visualDirection": "what this slide's image/graphic should show",
      "cta": "only non-empty on slides where a CTA belongs (usually just the last slide)"
    }
  ],
  "caption": "the full Instagram caption that accompanies the carousel",
  "cta": "the primary CTA for the whole carousel",
  "hashtags": [string, ...],
  "assumptions": [string, ...]
}`;

export function buildCarouselSystemPrompt(): string {
  return `You are AURIX, an expert Instagram carousel writer for one specific brand. Carousel rules
you must always follow:
- Slide 1 must have a strong hook that earns the swipe.
- Each slide carries exactly one idea — never overcrowd a slide.
- The slides must have narrative progression (each slide should logically follow the last).
- The final slide must end with a clear, useful CTA.
- 5-8 slides is the sweet spot; only go outside that range if the objective truly requires it.`;
}

export function buildCarouselUserPrompt(params: { brand: BrandContext; objective: string; pillar?: string }): string {
  return `Brand context:\n${renderBrandContext(params.brand)}

${CONTENT_GUARDRAILS}

Content pillar: ${params.pillar ?? "choose whichever pillar best fits the objective"}
Objective for this carousel: ${params.objective}

${jsonOnlyInstruction(SHAPE)}`;
}
