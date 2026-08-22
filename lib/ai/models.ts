import { getEnv } from "@/lib/env";

/**
 * Task-based model selection (spec § cost control): cheap/fast models for simple, high-volume
 * tasks; stronger reasoning models reserved for strategy and quality review.
 */
export type AITaskComplexity = "fast" | "content" | "strategy";

export function modelForTask(task: AITaskComplexity): string {
  const env = getEnv();
  const models =
    env.AI_PROVIDER === "gemini"
      ? { fast: env.GEMINI_MODEL_FAST, strategy: env.GEMINI_MODEL_STRATEGY, content: env.GEMINI_MODEL_CONTENT }
      : { fast: env.AI_MODEL_FAST, strategy: env.AI_MODEL_STRATEGY, content: env.AI_MODEL_CONTENT };
  return models[task];
}
