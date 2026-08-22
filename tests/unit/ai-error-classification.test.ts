import { describe, expect, it } from "vitest";
import {
  AINotConfiguredError,
  AIProviderError,
  classifyHttpStatus,
} from "@/lib/ai/provider";

describe("classifyHttpStatus", () => {
  it("maps 401 to INVALID_API_KEY", () => {
    expect(classifyHttpStatus(401)).toBe("INVALID_API_KEY");
  });

  it("maps 403 to PERMISSION_DENIED", () => {
    expect(classifyHttpStatus(403)).toBe("PERMISSION_DENIED");
  });

  it("maps 404 to MODEL_NOT_FOUND (the real Gemini 'model no longer available' shape)", () => {
    expect(classifyHttpStatus(404)).toBe("MODEL_NOT_FOUND");
  });

  it("maps 429 to RATE_LIMITED", () => {
    expect(classifyHttpStatus(429)).toBe("RATE_LIMITED");
  });

  it("maps 400 to INVALID_REQUEST", () => {
    expect(classifyHttpStatus(400)).toBe("INVALID_REQUEST");
  });

  it("maps 5xx to NETWORK_ERROR", () => {
    expect(classifyHttpStatus(500)).toBe("NETWORK_ERROR");
    expect(classifyHttpStatus(503)).toBe("NETWORK_ERROR");
  });

  it("maps anything else to UNKNOWN", () => {
    expect(classifyHttpStatus(418)).toBe("UNKNOWN");
    expect(classifyHttpStatus(0)).toBe("UNKNOWN");
  });
});

describe("AIProviderError", () => {
  it("defaults to code UNKNOWN and retryable false when not specified", () => {
    const err = new AIProviderError("boom");
    expect(err.code).toBe("UNKNOWN");
    expect(err.retryable).toBe(false);
  });

  it("carries the code and retryable flag passed to it", () => {
    const err = new AIProviderError("rate limited", { code: "RATE_LIMITED", retryable: true });
    expect(err.code).toBe("RATE_LIMITED");
    expect(err.retryable).toBe(true);
  });
});

describe("AINotConfiguredError", () => {
  it("always carries code PROVIDER_NOT_CONFIGURED and names the missing env var, never a key value", () => {
    const err = new AINotConfiguredError("Gemini", "GEMINI_API_KEY");
    expect(err.code).toBe("PROVIDER_NOT_CONFIGURED");
    expect(err.retryable).toBe(false);
    expect(err.message).toContain("GEMINI_API_KEY");
    expect(err.message).toContain("Gemini");
  });
});
