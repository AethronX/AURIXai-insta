import { GoogleGenAI, ApiError } from "@google/genai";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/observability/logger";
import {
  AINotConfiguredError,
  AIProviderError,
  classifyHttpStatus,
  type AIProvider,
  type GenerateTextParams,
  type GenerateTextResult,
} from "@/lib/ai/provider";

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  private client: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    const env = getEnv();
    if (!env.GEMINI_API_KEY) throw new AINotConfiguredError("Gemini", "GEMINI_API_KEY");
    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    }
    return this.client;
  }

  isConfigured(): boolean {
    return Boolean(getEnv().GEMINI_API_KEY);
  }

  async generateText(params: GenerateTextParams): Promise<GenerateTextResult> {
    const client = this.getClient();

    try {
      const response = await client.models.generateContent({
        model: params.model,
        contents: params.prompt,
        config: {
          systemInstruction: params.system,
          maxOutputTokens: params.maxTokens ?? 4096,
          temperature: params.temperature ?? 0.7,
          // When the caller (structured-output.ts) needs JSON back, ask Gemini's native
          // structured-output mode for it instead of relying on prompt instructions the model can
          // ignore — this is what actually fixes "No JSON object found in AI response": the model
          // can no longer wrap the JSON in prose or markdown fences.
          //
          // Deliberately NOT also passing responseSchema/responseJsonSchema here: Gemini's two
          // schema-constrained modes use restricted dialects (responseJsonSchema supports only a
          // documented subset of JSON Schema keywords — no `pattern`/`minLength`/property-scoped
          // `$ref`; responseSchema uses Google's own OpenAPI-subset Schema type, not JSON Schema,
          // so a converted Zod schema can't be handed to it directly). Converting
          // brandExtractionOutputSchema (regex-constrained hex colors, nullable ints, enum refs)
          // into either dialect without the ability to test against the live API risks trading
          // one unverified failure mode for another. responseMimeType alone is unconditionally
          // supported and needs no schema translation; Zod (lib/validation/ai-schemas.ts) stays
          // the actual structural validator either way, per the retry loop below.
          ...(params.responseSchema
            ? {
                responseMimeType: "application/json",
                // Root cause of "AI response contained a { ... } slice that is not valid JSON":
                // Gemini 3.x models spend "thinking" tokens by default when no thinkingConfig is
                // set, and those tokens are drawn from the SAME maxOutputTokens budget as the
                // final answer (confirmed via Google's own docs and reproduced bug reports, e.g.
                // googleapis/python-genai#2062 and ha-llmvision#609 — a low/moderate
                // maxOutputTokens can be almost entirely consumed by thinking, truncating the JSON
                // mid-object). This pipeline needs a direct structured answer, not chain-of-thought
                // reasoning — quality review is already a separate, explicit generation step — so
                // thinking is turned off entirely (thinkingBudget: 0 is the only way to fully
                // disable it; it cannot be combined with thinkingLevel on Gemini 3 models).
                thinkingConfig: { thinkingBudget: 0 },
              }
            : {}),
        },
      });

      const text = (response.text ?? "").trim();
      const usage = response.usageMetadata;

      return {
        text,
        usage: {
          inputTokens: usage?.promptTokenCount ?? 0,
          outputTokens: usage?.candidatesTokenCount ?? 0,
        },
        stopReason: response.candidates?.[0]?.finishReason ?? null,
      };
    } catch (err) {
      logger.error({ err, model: params.model }, "Gemini API call failed");
      if (err instanceof ApiError) {
        const retryable = err.status === 429 || err.status >= 500;
        throw new AIProviderError(`Gemini API error (${err.status}): ${err.message}`, {
          cause: err,
          retryable,
          code: classifyHttpStatus(err.status),
        });
      }
      throw new AIProviderError("Gemini API call failed", { cause: err, retryable: true, code: "NETWORK_ERROR" });
    }
  }
}
