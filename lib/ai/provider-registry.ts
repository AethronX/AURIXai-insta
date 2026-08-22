import { getEnv } from "@/lib/env";
import { ClaudeProvider } from "@/lib/ai/claude-provider";
import { GeminiProvider } from "@/lib/ai/gemini-provider";
import type { AIProvider } from "@/lib/ai/provider";

let cached: AIProvider | null = null;

/** Picks the reasoning provider via AI_PROVIDER ("claude" | "gemini") — the rest of the app never
 * imports ClaudeProvider/GeminiProvider directly, only this. */
export function getAIProvider(): AIProvider {
  if (cached) return cached;
  cached = getEnv().AI_PROVIDER === "gemini" ? new GeminiProvider() : new ClaudeProvider();
  return cached;
}
