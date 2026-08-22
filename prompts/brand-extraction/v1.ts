import { jsonOnlyInstruction } from "@/prompts/shared";

export const BRAND_EXTRACTION_PROMPT_VERSION = "brand-extraction.v1";

const VOICE_TONES =
  "PROFESSIONAL, FRIENDLY, BOLD, EDUCATIONAL, LUXURY, MINIMAL, HUMOROUS, INSPIRATIONAL, TECHNICAL";
const DIALECTS = "MSA, EGYPTIAN, GULF, LEVANTINE, MAGHREBI, NONE";

const SHAPE = `{
  "name": string,
  "industry": string,
  "description": string,
  "website": string,
  "instagram": string,
  "location": string,
  "targetMarket": string,
  "products": [string, ...],
  "services": [string, ...],
  "audience": {
    "targetCustomer": string,
    "ageRangeMin": number | null,
    "ageRangeMax": number | null,
    "interests": [string, ...],
    "painPoints": [string, ...],
    "desires": [string, ...],
    "buyingBehavior": string
  },
  "voice": {
    "primaryTone": one of [${VOICE_TONES}],
    "secondaryTones": array of any of [${VOICE_TONES}],
    "customInstructions": string
  },
  "visualIdentity": {
    "primaryColor": "#rrggbb or empty string",
    "secondaryColor": "#rrggbb or empty string",
    "accentColor": "#rrggbb or empty string",
    "fontPrimary": string,
    "fontSecondary": string,
    "imageStyle": string,
    "designReferences": [string, ...]
  },
  "contentRules": {
    "wordsToUse": [string, ...],
    "wordsToAvoid": [string, ...],
    "claimsToAvoid": [string, ...],
    "topicsToAvoid": [string, ...],
    "ctaStyle": string,
    "hashtagStrategy": string,
    "language": "en" | "ar" | "en-ar",
    "dialect": one of [${DIALECTS}]
  }
}`;

export function buildBrandExtractionSystemPrompt(): string {
  return `You are AURIX's onboarding assistant. A business owner will paste a free-text description of
their business, and your job is to turn it into a structured brand profile that pre-fills a form —
the owner reviews and edits every field before anything is saved, so this is a draft, not a
final record.

Hard rules:
- Only extract or directly restate facts actually present in the description (business name,
  what it does, location, products/services, target audience if stated, website/Instagram handle
  if given). Never invent specific facts: no fabricated prices, client names, awards, guarantees,
  years in business, or statistics that weren't in the text.
- Where the description doesn't give you enough to fill a field (e.g. no colors, no explicit
  tone), you MAY make a sensible creative suggestion appropriate to the described business
  (e.g. suggest calming pastel colors for a wellness brand) — but only for genuinely
  stylistic/creative fields (colors, fonts, image style, tone, hashtag strategy, CTA style), never
  for factual fields (name, location, products, target market). If a factual field isn't
  mentioned, leave it as an empty string or empty array — do not guess.
- Detect the language the description is written in and set "language"/"dialect" accordingly
  (Arabic text -> "language": "ar" and pick the closest dialect if evident, otherwise "NONE";
  English text -> "language": "en").
- Respond with ONLY the JSON object — no commentary, no markdown fences.`;
}

export function buildBrandExtractionUserPrompt(description: string): string {
  return `Business description (verbatim, from the owner):
"""
${description}
"""

${jsonOnlyInstruction(SHAPE)}`;
}
