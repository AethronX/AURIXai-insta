/** Guardrails appended to every content-generation prompt — never business-specific, so it's shared. */
export const CONTENT_GUARDRAILS = `Hard rules:
- Never invent facts, prices, statistics, credentials, or claims about the business that were not
  given to you in the brand context below. If you need a plausible detail that wasn't provided,
  write a generic placeholder and list it in "assumptions" instead of inventing specifics.
- Respect every entry in "Never use", "Never claim", and "Never discuss" exactly — no exceptions,
  no rephrasing around them.
- Match the brand's voice and language/dialect exactly as specified.
- Weight the brand's "Learned preferences" heavily — these came directly from the human reviewing
  past content, and are more important than generic best practice.
- Output ONLY the JSON object described below. No markdown code fences, no commentary before or
  after, no trailing text.`;

export function jsonOnlyInstruction(shapeDescription: string): string {
  return `Respond with a single JSON object shaped exactly like this (types matter; do not add extra top-level keys):\n${shapeDescription}`;
}
