import Anthropic from "@anthropic-ai/sdk";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/observability/logger";
import {
  AINotConfiguredError,
  AIProviderError,
  type AIProvider,
  type GenerateTextParams,
  type GenerateTextResult,
} from "@/lib/ai/provider";

const REQUEST_TIMEOUT_MS = 60_000;

export class ClaudeProvider implements AIProvider {
  readonly name = "claude";
  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    const env = getEnv();
    if (!env.ANTHROPIC_API_KEY) throw new AINotConfiguredError("Claude", "ANTHROPIC_API_KEY");
    if (!this.client) {
      this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: REQUEST_TIMEOUT_MS });
    }
    return this.client;
  }

  isConfigured(): boolean {
    return Boolean(getEnv().ANTHROPIC_API_KEY);
  }

  async generateText(params: GenerateTextParams): Promise<GenerateTextResult> {
    const client = this.getClient();

    try {
      const response = await client.messages.create({
        model: params.model,
        max_tokens: params.maxTokens ?? 4096,
        temperature: params.temperature ?? 0.7,
        system: params.system,
        messages: [{ role: "user", content: params.prompt }],
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();

      return {
        text,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
        stopReason: response.stop_reason,
      };
    } catch (err) {
      logger.error({ err, model: params.model }, "Claude API call failed");
      if (err instanceof Anthropic.APIError) {
        const retryable = err.status === 429 || err.status === 529 || (err.status ?? 0) >= 500;
        throw new AIProviderError(`Claude API error (${err.status}): ${err.message}`, {
          cause: err,
          retryable,
        });
      }
      throw new AIProviderError("Claude API call failed", { cause: err, retryable: true });
    }
  }
}
