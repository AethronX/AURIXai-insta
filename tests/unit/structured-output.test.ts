import { describe, expect, it, vi, beforeEach } from "vitest";
import { z } from "zod";
import { AIProviderError } from "@/lib/ai/provider";

const aiJobStore: Record<string, unknown> = {};

vi.mock("@/lib/db", () => ({
  prisma: {
    aIJob: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const id = `job_${Object.keys(aiJobStore).length + 1}`;
        aiJobStore[id] = { id, ...data };
        return aiJobStore[id];
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        aiJobStore[where.id] = { ...(aiJobStore[where.id] as object), ...data };
        return aiJobStore[where.id];
      }),
    },
  },
}));

const generateText = vi.fn();
vi.mock("@/lib/ai/provider-registry", () => ({
  getAIProvider: () => ({
    name: "claude",
    isConfigured: () => true,
    generateText,
  }),
}));

import { generateValidatedJSON, AIGenerationError } from "@/lib/ai/structured-output";

const schema = z.object({ title: z.string().min(1), score: z.number().min(0).max(100) });

beforeEach(() => {
  generateText.mockReset();
  for (const k of Object.keys(aiJobStore)) delete aiJobStore[k];
});

describe("generateValidatedJSON", () => {
  it("returns validated data on the first attempt when the model responds with valid JSON", async () => {
    generateText.mockResolvedValueOnce({
      text: '```json\n{"title": "Hello", "score": 92}\n```',
      usage: { inputTokens: 10, outputTokens: 5 },
      stopReason: "end_turn",
    });

    const result = await generateValidatedJSON({
      jobType: "CONTENT_GENERATION",
      task: "fast",
      system: "sys",
      prompt: "prompt",
      schema,
      promptVersion: "test.v1",
    });

    expect(result.data).toEqual({ title: "Hello", score: 92 });
    expect(result.attempts).toBe(1);
    expect(generateText).toHaveBeenCalledTimes(1);
  });

  it("repairs once when the first response fails schema validation, then succeeds", async () => {
    generateText
      .mockResolvedValueOnce({
        text: '{"title": "", "score": 999}', // invalid: empty title, score out of range
        usage: { inputTokens: 10, outputTokens: 5 },
        stopReason: "end_turn",
      })
      .mockResolvedValueOnce({
        text: '{"title": "Fixed", "score": 80}',
        usage: { inputTokens: 12, outputTokens: 6 },
        stopReason: "end_turn",
      });

    const result = await generateValidatedJSON({
      jobType: "CONTENT_GENERATION",
      task: "fast",
      system: "sys",
      prompt: "prompt",
      schema,
      promptVersion: "test.v1",
    });

    expect(result.data).toEqual({ title: "Fixed", score: 80 });
    expect(result.attempts).toBe(2);
    expect(generateText).toHaveBeenCalledTimes(2);
    // The repair prompt must include the validation errors so the model can actually fix them.
    const secondCallArgs = generateText.mock.calls[1][0];
    expect(secondCallArgs.prompt).toContain("failed validation");
  });

  it("throws AIGenerationError after two failed attempts and records the job as FAILED", async () => {
    generateText
      .mockResolvedValueOnce({ text: "not json at all", usage: { inputTokens: 1, outputTokens: 1 }, stopReason: "end_turn" })
      .mockResolvedValueOnce({ text: "still not json", usage: { inputTokens: 1, outputTokens: 1 }, stopReason: "end_turn" });

    await expect(
      generateValidatedJSON({
        jobType: "CONTENT_GENERATION",
        task: "fast",
        system: "sys",
        prompt: "prompt",
        schema,
        promptVersion: "test.v1",
      })
    ).rejects.toThrow(AIGenerationError);

    expect(generateText).toHaveBeenCalledTimes(2);
    const jobs = Object.values(aiJobStore) as Array<{ status: string }>;
    expect(jobs.some((j) => j.status === "FAILED")).toBe(true);
  });

  it("classifies a response with no extractable JSON as MALFORMED_RESPONSE, retries once, and still tags the failed job", async () => {
    // Regression test for the exact reported bug: "AI generation failed after retries: No JSON
    // object found in AI response" — this is retryable (the model gets one more chance with the
    // parse failure fed back to it), unlike a hard provider error such as PROVIDER_NOT_CONFIGURED.
    generateText
      .mockResolvedValueOnce({
        text: "I'd be happy to help with that request.",
        usage: { inputTokens: 1, outputTokens: 1 },
        stopReason: "end_turn",
      })
      .mockResolvedValueOnce({
        text: "Still no JSON here either.",
        usage: { inputTokens: 1, outputTokens: 1 },
        stopReason: "end_turn",
      });

    await expect(
      generateValidatedJSON({
        jobType: "CONTENT_GENERATION",
        task: "fast",
        system: "sys",
        prompt: "prompt",
        schema,
        promptVersion: "test.v1",
      })
    ).rejects.toMatchObject({ code: "MALFORMED_RESPONSE" });

    expect(generateText).toHaveBeenCalledTimes(2);
    const jobs = Object.values(aiJobStore) as Array<{ errorMessage?: string }>;
    expect(jobs.some((j) => j.errorMessage?.startsWith("[MALFORMED_RESPONSE]"))).toBe(true);
  });

  it("forwards the Zod schema to the provider as responseSchema so a provider can request native JSON output", async () => {
    generateText.mockResolvedValueOnce({
      text: '{"title": "Hello", "score": 92}',
      usage: { inputTokens: 10, outputTokens: 5 },
      stopReason: "end_turn",
    });

    await generateValidatedJSON({
      jobType: "CONTENT_GENERATION",
      task: "fast",
      system: "sys",
      prompt: "prompt",
      schema,
      promptVersion: "test.v1",
    });

    const callArgs = generateText.mock.calls[0][0];
    expect(callArgs.responseSchema).toBe(schema);
  });

  it("never returns data that doesn't satisfy the schema, even if JSON parses cleanly", async () => {
    generateText.mockResolvedValue({
      text: '{"title": "ok", "score": "not-a-number"}',
      usage: { inputTokens: 1, outputTokens: 1 },
      stopReason: "end_turn",
    });

    await expect(
      generateValidatedJSON({
        jobType: "CONTENT_GENERATION",
        task: "fast",
        system: "sys",
        prompt: "prompt",
        schema,
        promptVersion: "test.v1",
      })
    ).rejects.toThrow();
  });

  it("stops after one attempt and surfaces PROVIDER_NOT_CONFIGURED without retrying when the provider isn't configured", async () => {
    generateText.mockRejectedValueOnce(
      new AIProviderError("Gemini is not configured. Add GEMINI_API_KEY in Settings > Integrations to enable AI generation.", {
        retryable: false,
        code: "PROVIDER_NOT_CONFIGURED",
      })
    );

    await expect(
      generateValidatedJSON({
        jobType: "CONTENT_GENERATION",
        task: "fast",
        system: "sys",
        prompt: "prompt",
        schema,
        promptVersion: "test.v1",
      })
    ).rejects.toMatchObject({ code: "PROVIDER_NOT_CONFIGURED" });

    // Non-retryable provider errors (like "not configured") must not burn a second attempt —
    // and critically, must never fall through to a different provider.
    expect(generateText).toHaveBeenCalledTimes(1);
    const jobs = Object.values(aiJobStore) as Array<{ status: string; errorMessage?: string }>;
    expect(jobs.some((j) => j.status === "FAILED" && j.errorMessage?.startsWith("[PROVIDER_NOT_CONFIGURED]"))).toBe(
      true
    );
  });

  it("classifies a Gemini-style 404 model error as MODEL_NOT_FOUND on the thrown error and the failed job", async () => {
    generateText.mockRejectedValueOnce(
      new AIProviderError(
        'Gemini API error (404): {"error":{"code":404,"message":"model no longer available"}}',
        { retryable: false, code: "MODEL_NOT_FOUND" }
      )
    );

    await expect(
      generateValidatedJSON({
        jobType: "CONTENT_GENERATION",
        task: "fast",
        system: "sys",
        prompt: "prompt",
        schema,
        promptVersion: "test.v1",
      })
    ).rejects.toMatchObject({ code: "MODEL_NOT_FOUND" });

    const jobs = Object.values(aiJobStore) as Array<{ errorMessage?: string }>;
    expect(jobs.some((j) => j.errorMessage?.startsWith("[MODEL_NOT_FOUND]"))).toBe(true);
  });

  it("never logs or persists the raw error text containing something that looks like an API key", async () => {
    // Provider errors should never embed credentials in their message; this guards the
    // errorMessage persisted on AIJob (the one place a leaking provider bug would surface).
    generateText.mockRejectedValueOnce(
      new AIProviderError("Claude API error (401): invalid x-api-key header", {
        retryable: false,
        code: "INVALID_API_KEY",
      })
    );

    await expect(
      generateValidatedJSON({
        jobType: "CONTENT_GENERATION",
        task: "fast",
        system: "sys",
        prompt: "prompt",
        schema,
        promptVersion: "test.v1",
      })
    ).rejects.toMatchObject({ code: "INVALID_API_KEY" });

    const jobs = Object.values(aiJobStore) as Array<{ errorMessage?: string }>;
    const failed = jobs.find((j) => j.errorMessage?.startsWith("[INVALID_API_KEY]"));
    expect(failed?.errorMessage).not.toMatch(/sk-ant-|AIza[0-9A-Za-z_-]{20,}/);
  });
});
