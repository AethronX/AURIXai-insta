import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// getAIProvider() must deterministically hand back GeminiProvider when AI_PROVIDER=gemini and
// ClaudeProvider when AI_PROVIDER=claude — never the other one, and never a silent fallback from
// one to the other, and never a silent fallback to "claude" when AI_PROVIDER is simply unset
// (the exact screenshot bug: onboarding's "Generate brand profile" showing "Claude is not
// configured" while Vercel Production was believed to have AI_PROVIDER=gemini set).

// claude-provider.ts and gemini-provider.ts both import lib/observability/logger.ts, which calls
// pino({ level: env.LOG_LEVEL }) at module load time — the mocked getEnv() must include a real
// LOG_LEVEL or pino throws before the provider classes even load.
const baseEnv = { LOG_LEVEL: "info" as const, NODE_ENV: "test" as const };

describe("getAIProvider (mocked resolveAIProviderName)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("selects GeminiProvider when AI_PROVIDER=gemini", async () => {
    vi.doMock("@/lib/env", () => ({
      getEnv: () => baseEnv,
      resolveAIProviderName: () => "gemini",
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
      getEnv: () => baseEnv,
      resolveAIProviderName: () => "claude",
    }));
    const { getAIProvider } = await import("@/lib/ai/provider-registry");
    const { GeminiProvider } = await import("@/lib/ai/gemini-provider");
    const { ClaudeProvider } = await import("@/lib/ai/claude-provider");

    const provider = getAIProvider();

    expect(provider).toBeInstanceOf(ClaudeProvider);
    expect(provider).not.toBeInstanceOf(GeminiProvider);
    expect(provider.name).toBe("claude");
  });

  it("caches the resolved provider across repeated calls instead of re-resolving each time", async () => {
    let reads = 0;
    vi.doMock("@/lib/env", () => ({
      getEnv: () => baseEnv,
      resolveAIProviderName: () => {
        reads += 1;
        return "gemini";
      },
    }));
    const { getAIProvider } = await import("@/lib/ai/provider-registry");

    const first = getAIProvider();
    const readsAfterFirst = reads;
    const second = getAIProvider();

    expect(second).toBe(first);
    expect(reads).toBe(readsAfterFirst);
  });

  it("never constructs ClaudeProvider when AI_PROVIDER=gemini, even if Claude's constructor is watched", async () => {
    vi.doMock("@/lib/env", () => ({
      getEnv: () => baseEnv,
      resolveAIProviderName: () => "gemini",
    }));
    const claudeCtor = vi.fn();
    vi.doMock("@/lib/ai/claude-provider", async () => {
      const actual = await vi.importActual<typeof import("@/lib/ai/claude-provider")>(
        "@/lib/ai/claude-provider"
      );
      class WatchedClaudeProvider extends actual.ClaudeProvider {
        constructor() {
          claudeCtor();
          super();
        }
      }
      return { ClaudeProvider: WatchedClaudeProvider };
    });

    const { getAIProvider } = await import("@/lib/ai/provider-registry");
    const { GeminiProvider } = await import("@/lib/ai/gemini-provider");

    const provider = getAIProvider();

    expect(provider).toBeInstanceOf(GeminiProvider);
    expect(claudeCtor).not.toHaveBeenCalled();
  });
});

describe("resolveAIProviderName (real lib/env.ts, real process.env)", () => {
  const originalAiProvider = process.env.AI_PROVIDER;

  beforeEach(() => {
    // Undo the vi.doMock calls from the describe block above so these tests exercise the real
    // lib/env.ts and lib/ai/claude-provider.ts, not a leftover mock from a prior test.
    vi.doUnmock("@/lib/env");
    vi.doUnmock("@/lib/ai/claude-provider");
    vi.resetModules();
  });

  afterEach(() => {
    if (originalAiProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = originalAiProvider;
  });

  it("throws PROVIDER_NOT_CONFIGURED — not a silent fallback to claude — when AI_PROVIDER is unset", async () => {
    delete process.env.AI_PROVIDER;
    const { resolveAIProviderName } = await import("@/lib/env");

    expect(() => resolveAIProviderName()).toThrowError(/AI_PROVIDER is not configured/);
    try {
      resolveAIProviderName();
      expect.unreachable();
    } catch (err) {
      expect(err).toMatchObject({ code: "PROVIDER_NOT_CONFIGURED" });
      // The exact screenshot bug: the message must not claim Claude specifically was chosen and
      // unconfigured — it may still name "claude" as one of the two valid values to set.
      expect((err as Error).message).not.toMatch(/^claude is not configured/i);
      expect((err as Error).message).toMatch(/AI_PROVIDER is not configured/);
    }
  });

  it("getAIProvider() surfaces the same PROVIDER_NOT_CONFIGURED error end-to-end when AI_PROVIDER is unset", async () => {
    delete process.env.AI_PROVIDER;
    const { getAIProvider } = await import("@/lib/ai/provider-registry");

    expect(() => getAIProvider()).toThrowError(/AI_PROVIDER is not configured/);
  });

  it("resolves to gemini from real process.env when AI_PROVIDER=gemini", async () => {
    process.env.AI_PROVIDER = "gemini";
    const { resolveAIProviderName } = await import("@/lib/env");

    expect(resolveAIProviderName()).toBe("gemini");
  });
});
