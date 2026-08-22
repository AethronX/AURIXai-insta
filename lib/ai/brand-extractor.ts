import "server-only";
import { generateValidatedJSON } from "@/lib/ai/structured-output";
import { brandExtractionOutputSchema, type BrandExtractionOutput } from "@/lib/validation/ai-schemas";
import {
  buildBrandExtractionSystemPrompt,
  buildBrandExtractionUserPrompt,
  BRAND_EXTRACTION_PROMPT_VERSION,
} from "@/prompts/brand-extraction/v1";

export interface ExtractBrandFromDescriptionParams {
  description: string;
  organizationId: string;
}

/** Turns a free-text business description into a full onboarding-form prefill — a draft the user
 * still reviews and edits on the normal step form, never a bypass of that review. */
export async function extractBrandFromDescription(
  params: ExtractBrandFromDescriptionParams
): Promise<BrandExtractionOutput> {
  const { data } = await generateValidatedJSON({
    jobType: "BRAND_EXTRACTION",
    task: "fast",
    system: buildBrandExtractionSystemPrompt(),
    prompt: buildBrandExtractionUserPrompt(params.description),
    schema: brandExtractionOutputSchema,
    promptVersion: BRAND_EXTRACTION_PROMPT_VERSION,
    organizationId: params.organizationId,
    maxTokens: 2000,
  });
  return data;
}
