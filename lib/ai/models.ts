import { getEnv } from "@/lib/env";

/**
 * Task-based model selection (spec § cost control): cheap/fast models for simple, high-volume
 * tasks; stronger reasoning models reserved for strategy and quality review.
 */
export type AITaskComplexity = "fast" | "content" | "strategy";

export function modelForTask(task: AITaskComplexity): string {
  const env = getEnv();
  switch (task) {
    case "fast":
      return env.AI_MODEL_FAST;
    case "strategy":
      return env.AI_MODEL_STRATEGY;
    case "content":
    default:
      return env.AI_MODEL_CONTENT;
  }
}
