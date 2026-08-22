import { describe, expect, it, vi, beforeEach } from "vitest";
import { z } from "zod";

// Regression coverage for the "AI generation failed after retries: No JSON object found in AI
// response" bug: once AI_PROVIDER=gemini was actually reached (after the provider-selection fix),
// Gemini's default text/plain output let the model wrap JSON in prose/markdown that extractJson()
// couldn't always recover. The fix is requesting responseMimeType: "application/json" whenever a
// caller supplies a schema — these tests assert that config actually reaches the SDK call.

const generateContent = vi.fn();

vi.mock("@google/genai", () => {
  class ApiError extends Error {
    status: number;
    constructor(opts: { message: string; status: number }) {
      super(opts.message);
      this.status = opts.status;
    }
  }
  class GoogleGenAI {
    models = { generateContent };
  }
  return { GoogleGenAI, ApiError };
});

// lib/observability/logger.ts (imported by gemini-provider.ts) calls pino({ level: env.LOG_LEVEL })
// at module load — the mocked getEnv() must include a real LOG_LEVEL or pino throws on import.
vi.mock("@/lib/env", () => ({
  getEnv: () => ({ GEMINI_API_KEY: "test-gemini-key", LOG_LEVEL: "info", NODE_ENV: "test" }),
}));

describe("GeminiProvider.generateText", () => {
  beforeEach(() => {
    generateContent.mockReset();
    generateContent.mockResolvedValue({
      text: '{"ok":true}',
      usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 },
      candidates: [{ finishReason: "STOP" }],
    });
  });

  it("requests responseMimeType=application/json when the caller supplies a responseSchema", async () => {
    const { GeminiProvider } = await import("@/lib/ai/gemini-provider");
    const provider = new GeminiProvider();

    await provider.generateText({
      system: "s",
      prompt: "p",
      model: "gemini-3.6-flash",
      responseSchema: z.object({ ok: z.boolean() }),
    });

    expect(generateContent).toHaveBeenCalledTimes(1);
    const call = generateContent.mock.calls[0][0];
    expect(call.config.responseMimeType).toBe("application/json");
  });

  it("does not request JSON mode when no responseSchema is supplied", async () => {
    const { GeminiProvider } = await import("@/lib/ai/gemini-provider");
    const provider = new GeminiProvider();

    await provider.generateText({ system: "s", prompt: "p", model: "gemini-3.6-flash" });

    const call = generateContent.mock.calls[0][0];
    expect(call.config.responseMimeType).toBeUndefined();
  });
});
