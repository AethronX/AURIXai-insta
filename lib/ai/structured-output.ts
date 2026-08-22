import "server-only";
import type { z } from "zod";
import type { AIJobType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getAIProvider } from "@/lib/ai/provider-registry";
import { modelForTask, type AITaskComplexity } from "@/lib/ai/models";
import { extractJson } from "@/lib/ai/json-extract";
import { AIProviderError, type AIErrorCode } from "@/lib/ai/provider";
import { logger } from "@/lib/observability/logger";

export class AIGenerationError extends Error {
  constructor(message: string, public aiJobId?: string, public code: AIErrorCode = "UNKNOWN") {
    super(message);
    this.name = "AIGenerationError";
  }
}

export interface GenerateValidatedJSONParams<T> {
  jobType: AIJobType;
  task: AITaskComplexity;
  system: string;
  prompt: string;
  // Input left as `unknown` (not pinned to T) since schemas with `.default()` fields legitimately
  // have a wider Input type than Output — safeParse always takes `unknown` at runtime regardless.
  schema: z.ZodType<T, z.ZodTypeDef, unknown>;
  promptVersion: string;
  brandId?: string;
  organizationId?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface GenerateValidatedJSONResult<T> {
  data: T;
  aiJobId: string;
  model: string;
  attempts: number;
}

/**
 * The single choke point every AI generator (strategy/content/carousel/caption/creative/review)
 * goes through: Claude -> extract JSON -> Zod validate -> on failure, one repair retry that
 * feeds the validation errors back to the model -> on second failure, fail loudly. Every attempt
 * is recorded as an AIJob row for observability; nothing is ever silently accepted unvalidated.
 */
export async function generateValidatedJSON<T>(
  params: GenerateValidatedJSONParams<T>
): Promise<GenerateValidatedJSONResult<T>> {
  const provider = getAIProvider();
  const model = modelForTask(params.task);

  const job = await prisma.aIJob.create({
    data: {
      type: params.jobType,
      status: "RUNNING",
      provider: provider.name,
      model,
      promptVersion: params.promptVersion,
      brandId: params.brandId,
      organizationId: params.organizationId,
      startedAt: new Date(),
      inputSummary: { promptLength: params.prompt.length },
    },
  });

  let lastError: string = "";
  let lastErrorCode: AIErrorCode = "UNKNOWN";
  let lastRawText = "";

  for (let attempt = 1; attempt <= 2; attempt++) {
    // [AI] diagnostic line: provider/model/job/attempt only — never system prompt, user prompt, or API keys.
    logger.info(
      { jobId: job.id, provider: provider.name, model, attempt, jobType: params.jobType },
      "[AI] request started"
    );
    try {
      const effectivePrompt =
        attempt === 1
          ? params.prompt
          : `${params.prompt}\n\nYour previous response failed validation with these errors:\n${lastError}\n\nYour previous response was:\n${lastRawText}\n\nReturn ONLY corrected, valid JSON matching the required shape. No commentary, no markdown fences.`;

      const result = await provider.generateText({
        system: params.system,
        prompt: effectivePrompt,
        model,
        maxTokens: params.maxTokens,
        temperature: params.temperature,
        // Lets a provider with native structured-output support (GeminiProvider) request JSON at
        // the SDK level instead of relying solely on prompt wording. Never sent anywhere as text.
        responseSchema: params.schema,
      });
      lastRawText = result.text;

      // [AI DEBUG] response shape only — never the response content itself, which may contain
      // brand/business details the user hasn't approved for logging.
      const trimmed = result.text.trim();
      logger.info(
        {
          jobId: job.id,
          provider: provider.name,
          model,
          attempt,
          responseLength: result.text.length,
          responseFormat: trimmed.startsWith("{")
            ? "raw-json"
            : trimmed.includes("```")
              ? "fenced"
              : trimmed.length === 0
                ? "empty"
                : "prose-or-other",
        },
        "[AI] response received"
      );

      const parsed = extractJson(result.text);
      const validated = params.schema.safeParse(parsed);

      if (validated.success) {
        logger.info(
          { jobId: job.id, provider: provider.name, model, attempt },
          "[AI] request succeeded"
        );
        await prisma.aIJob.update({
          where: { id: job.id },
          data: {
            status: "SUCCEEDED",
            completedAt: new Date(),
            attempts: attempt,
            outputSummary: { attempt, usage: { ...result.usage } } as Prisma.InputJsonValue,
          },
        });
        return { data: validated.data, aiJobId: job.id, model, attempts: attempt };
      }

      lastErrorCode = "SCHEMA_VALIDATION_FAILED";
      lastError = validated.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      logger.warn(
        { jobId: job.id, provider: provider.name, model, attempt, code: lastErrorCode, lastError },
        "[AI] request failed: schema validation"
      );
    } catch (err) {
      lastErrorCode = err instanceof AIProviderError ? err.code : "UNKNOWN";
      lastError = err instanceof Error ? err.message : String(err);
      logger.error(
        { jobId: job.id, provider: provider.name, model, attempt, code: lastErrorCode, err },
        "[AI] request failed: provider error"
      );
      if (err instanceof AIProviderError && !err.retryable) break;
    }
  }

  await prisma.aIJob.update({
    where: { id: job.id },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      errorMessage: `[${lastErrorCode}] ${lastError}`.slice(0, 2000),
    },
  });

  throw new AIGenerationError(`AI generation failed after retries: ${lastError}`, job.id, lastErrorCode);
}
