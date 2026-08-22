import { describe, expect, it, vi, beforeEach } from "vitest";
import { z } from "zod";

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
});
