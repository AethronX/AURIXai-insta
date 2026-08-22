import { describe, expect, it, vi, beforeEach } from "vitest";
import { z } from "zod";

// Regression coverage for two chained production bugs, both only visible once AI_PROVIDER=gemini
// was actually being reached:
// 1. "No JSON object found in AI response" — Gemini's default text/plain output let the model
//    wrap JSON in prose/markdown. Fixed by requesting responseMimeType: "application/json".
// 2. "AI response contained a { ... } slice that is not valid JSON" — Gemini 3.x models spend
//    "thinking" tokens by default (no thinkingConfig set), drawn from the SAME maxOutputTokens
//    budget as the final answer, which can truncate the JSON mid-object. Fixed by
//    thinkingConfig: { thinkingBudget: 0 } — this pipeline needs a direct structured answer, not
//    chain-of-thought reasoning.
// These tests assert both config values actually reach the SDK call.

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

  it("disables thinking (thinkingBudget: 0) when the caller supplies a responseSchema, so the JSON can't be truncated by thinking tokens eating maxOutputTokens", async () => {
    const { GeminiProvider } = await import("@/lib/ai/gemini-provider");
    const provider = new GeminiProvider();

    await provider.generateText({
      system: "s",
      prompt: "p",
      model: "gemini-3.6-flash",
      maxTokens: 2000,
      responseSchema: z.object({ ok: z.boolean() }),
    });

    const call = generateContent.mock.calls[0][0];
    expect(call.config.thinkingConfig).toEqual({ thinkingBudget: 0 });
    // Never combine thinkingBudget with thinkingLevel — Gemini 3 models reject that combination.
    expect(call.config.thinkingConfig.thinkingLevel).toBeUndefined();
  });

  it("does not request JSON mode or touch thinking config when no responseSchema is supplied", async () => {
    const { GeminiProvider } = await import("@/lib/ai/gemini-provider");
    const provider = new GeminiProvider();

    await provider.generateText({ system: "s", prompt: "p", model: "gemini-3.6-flash" });

    const call = generateContent.mock.calls[0][0];
    expect(call.config.responseMimeType).toBeUndefined();
    expect(call.config.thinkingConfig).toBeUndefined();
  });

  it("surfaces finishReason as stopReason so a caller can detect MAX_TOKENS truncation", async () => {
    generateContent.mockResolvedValueOnce({
      text: '{"ok": tr',
      usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 2000 },
      candidates: [{ finishReason: "MAX_TOKENS" }],
    });
    const { GeminiProvider } = await import("@/lib/ai/gemini-provider");
    const provider = new GeminiProvider();

    const result = await provider.generateText({
      system: "s",
      prompt: "p",
      model: "gemini-3.6-flash",
      responseSchema: z.object({ ok: z.boolean() }),
    });

    expect(result.stopReason).toBe("MAX_TOKENS");
  });
});
