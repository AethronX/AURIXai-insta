/**
 * AI provider abstraction. The rest of the app (strategy agent, content/carousel generators,
 * quality reviewer, analytics agent) only ever talks to this interface — never to the Anthropic
 * SDK directly — so the reasoning provider can be swapped without touching business logic.
 */

export interface AIUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface GenerateTextParams {
  system: string;
  prompt: string;
  /** Concrete model id to use for this call — callers pick via lib/ai/models.ts based on task complexity. */
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface GenerateTextResult {
  text: string;
  usage: AIUsage;
  stopReason: string | null;
}

export class AIProviderError extends Error {
  cause?: unknown;
  retryable: boolean;
  constructor(message: string, opts?: { cause?: unknown; retryable?: boolean }) {
    super(message);
    this.name = "AIProviderError";
    this.cause = opts?.cause;
    this.retryable = opts?.retryable ?? false;
  }
}

export class AINotConfiguredError extends AIProviderError {
  constructor(providerLabel: string, envVar: string) {
    super(
      `${providerLabel} is not configured. Add ${envVar} in Settings > Integrations to enable AI generation.`,
      { retryable: false }
    );
    this.name = "AINotConfiguredError";
  }
}

export interface AIProvider {
  readonly name: string;
  isConfigured(): boolean;
  generateText(params: GenerateTextParams): Promise<GenerateTextResult>;
}
