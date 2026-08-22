import { describe, expect, it, vi, beforeEach } from "vitest";

// getAIProvider() must deterministically hand back GeminiProvider when AI_PROVIDER=gemini and
// ClaudeProvider when AI_PROVIDER=claude (the default) — never the other one, and never a silent
// fallback from one to the other. lib/env.ts caches getEnv() at module scope, and
// provider-registry.ts caches its own instance too, so each case gets a fully fresh module graph.

// claude-provider.ts and gemini-provider.ts both import lib/observability/logger.ts, which calls
// pino({ level: env.LOG_LEVEL }) at module load time — the mocked getEnv() must include a real
// LOG_LEVEL or pino throws before the provider classes even load.
const baseEnv = { LOG_LEVEL: "info" as const, NODE_ENV: "test" as const };

describe("getAIProvider", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("selects GeminiProvider when AI_PROVIDER=gemini", async () => {
    vi.doMock("@/lib/env", () => ({
      getEnv: () => ({ ...baseEnv, AI_PROVIDER: "gemini" }),
    }));
    const { getAIProvider } = await import("@/lib/ai/provider-registry");
    const { GeminiProvider } = await import("@/lib/ai/gemini-provider");
    const { ClaudeProvider } = await import("@/lib/ai/claude-provider");

    const provider = getAIProvider();

    expect(provider).toBeInstanceOf(GeminiProvider);
    expect(provider).not.toBeInstanceOf(ClaudeProvider);
    expect(provider.name).toBe("gemini");
  });

  it("selects ClaudeProvider when AI_PROVIDER=claude", async () => {
    vi.doMock("@/lib/env", () => ({
      getEnv: () => ({ ...baseEnv, AI_PROVIDER: "claude" }),
    }));
    const { getAIProvider } = await import("@/lib/ai/provider-registry");
    const { GeminiProvider } = await import("@/lib/ai/gemini-provider");
    const { ClaudeProvider } = await import("@/lib/ai/claude-provider");

    const provider = getAIProvider();

    expect(provider).toBeInstanceOf(ClaudeProvider);
    expect(provider).not.toBeInstanceOf(GeminiProvider);
    expect(provider.name).toBe("claude");
  });

  it("selects ClaudeProvider when AI_PROVIDER is unset (schema default)", async () => {
    vi.doMock("@/lib/env", () => ({
      getEnv: () => baseEnv, // no AI_PROVIDER key at all — mirrors the Zod default of "claude"
    }));
    const { getAIProvider } = await import("@/lib/ai/provider-registry");
    const { ClaudeProvider } = await import("@/lib/ai/claude-provider");

    expect(getAIProvider()).toBeInstanceOf(ClaudeProvider);
  });

  it("caches the resolved provider across repeated calls instead of re-reading env each time", async () => {
    let reads = 0;
    vi.doMock("@/lib/env", () => ({
      getEnv: () => {
        reads += 1;
        return { ...baseEnv, AI_PROVIDER: "gemini" };
      },
    }));
    const { getAIProvider } = await import("@/lib/ai/provider-registry");

    const first = getAIProvider();
    const readsAfterFirst = reads;
    const second = getAIProvider();

    expect(second).toBe(first);
    // getEnv() is also called once at module load by lib/observability/logger.ts, so the exact
    // count isn't 1 — what matters is that a *second* getAIProvider() call doesn't read env again.
    expect(reads).toBe(readsAfterFirst);
  });
});
