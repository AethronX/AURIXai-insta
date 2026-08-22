import { GoogleGenAI, ApiError } from "@google/genai";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/observability/logger";
import {
  AINotConfiguredError,
  AIProviderError,
  type AIProvider,
  type GenerateTextParams,
  type GenerateTextResult,
} from "@/lib/ai/provider";

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  private client: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    const env = getEnv();
    if (!env.GOOGLE_API_KEY) throw new AINotConfiguredError("Gemini", "GOOGLE_API_KEY");
    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey: env.GOOGLE_API_KEY });
    }
    return this.client;
  }

  isConfigured(): boolean {
    return Boolean(getEnv().GOOGLE_API_KEY);
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
        });
      }
      throw new AIProviderError("Gemini API call failed", { cause: err, retryable: true });
    }
  }
}
