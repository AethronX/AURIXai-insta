import { resolveAIProviderName } from "@/lib/env";
import { ClaudeProvider } from "@/lib/ai/claude-provider";
import { GeminiProvider } from "@/lib/ai/gemini-provider";
import type { AIProvider } from "@/lib/ai/provider";

let cached: AIProvider | null = null;

/** Picks the reasoning provider via AI_PROVIDER ("claude" | "gemini") — the rest of the app never
 * imports ClaudeProvider/GeminiProvider directly, only this. resolveAIProviderName() throws if
 * AI_PROVIDER is unset or invalid, so an unconfigured environment fails here — loudly, as
 * PROVIDER_NOT_CONFIGURED — rather than this ternary quietly falling through to Claude. */
export function getAIProvider(): AIProvider {
  if (cached) return cached;
  cached = resolveAIProviderName() === "gemini" ? new GeminiProvider() : new ClaudeProvider();
  return cached;
}
