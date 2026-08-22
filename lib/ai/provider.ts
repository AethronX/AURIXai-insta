/**
 * AI provider abstraction. The rest of the app (strategy agent, content/carousel generators,
 * quality reviewer, analytics agent) only ever talks to this interface — never to the Anthropic
 * SDK directly — so the reasoning provider can be swapped without touching business logic.
 */
import type { z } from "zod";

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
  /**
   * The Zod schema the caller will validate the response against (structured-output.ts always
   * passes this — it's the same schema generateValidatedJSON later calls .safeParse with).
   * Providers with native structured-output support (GeminiProvider: responseMimeType +
   * responseJsonSchema) may use this to constrain generation so the model can't return prose
   * around the JSON. Providers without that capability (ClaudeProvider) simply ignore it — Zod
   * validation downstream remains the single source of truth regardless of what a provider does
   * with this hint.
   */
  responseSchema?: z.ZodType<unknown>;
}

export interface GenerateTextResult {
  text: string;
  usage: AIUsage;
  stopReason: string | null;
}

/**
 * Coarse, provider-agnostic classification so a caller (or a human reading logs) can tell what
 * actually went wrong without parsing prose. Never invented per-provider — both ClaudeProvider
 * and GeminiProvider map their SDK's HTTP status onto the same set via classifyHttpStatus below.
 */
export type AIErrorCode =
  | "PROVIDER_NOT_CONFIGURED"
  | "MODEL_NOT_FOUND"
  | "INVALID_API_KEY"
  | "PERMISSION_DENIED"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "INVALID_REQUEST"
  | "MALFORMED_RESPONSE"
  | "SCHEMA_VALIDATION_FAILED"
  | "UNKNOWN";

export class AIProviderError extends Error {
  cause?: unknown;
  retryable: boolean;
  code: AIErrorCode;
  constructor(message: string, opts?: { cause?: unknown; retryable?: boolean; code?: AIErrorCode }) {
    super(message);
    this.name = "AIProviderError";
    this.cause = opts?.cause;
    this.retryable = opts?.retryable ?? false;
    this.code = opts?.code ?? "UNKNOWN";
  }
}

export class AINotConfiguredError extends AIProviderError {
  constructor(providerLabel: string, envVar: string) {
    super(
      `${providerLabel} is not configured. Add ${envVar} in Settings > Integrations to enable AI generation.`,
      { retryable: false, code: "PROVIDER_NOT_CONFIGURED" }
    );
    this.name = "AINotConfiguredError";
  }
}

/** Maps an HTTP status from either provider's SDK onto the shared AIErrorCode set. */
export function classifyHttpStatus(status: number): AIErrorCode {
  if (status === 401) return "INVALID_API_KEY";
  if (status === 403) return "PERMISSION_DENIED";
  if (status === 404) return "MODEL_NOT_FOUND";
  if (status === 429) return "RATE_LIMITED";
  if (status === 400) return "INVALID_REQUEST";
  if (status >= 500) return "NETWORK_ERROR";
  return "UNKNOWN";
}

export interface AIProvider {
  readonly name: string;
  isConfigured(): boolean;
  generateText(params: GenerateTextParams): Promise<GenerateTextResult>;
}
