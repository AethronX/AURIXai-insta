import { describe, expect, it } from "vitest";
import { extractJson } from "@/lib/ai/json-extract";
import { AIProviderError } from "@/lib/ai/provider";

describe("extractJson", () => {
  it("parses raw JSON directly (the native-JSON-mode happy path)", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips a ```json fenced block", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("recovers JSON from surrounding prose via the outermost {...} slice", () => {
    expect(extractJson('Sure, here you go:\n{"a":1}\nHope that helps!')).toEqual({ a: 1 });
  });

  it("throws AIProviderError with code MALFORMED_RESPONSE when there is no { at all", () => {
    try {
      extractJson("I cannot help with that request.");
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AIProviderError);
      expect(err).toMatchObject({ code: "MALFORMED_RESPONSE", retryable: true });
    }
  });

  it("throws AIProviderError with code MALFORMED_RESPONSE when the {...} slice itself is not valid JSON", () => {
    try {
      extractJson("{not valid json, missing quotes}");
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AIProviderError);
      expect(err).toMatchObject({ code: "MALFORMED_RESPONSE" });
    }
  });
});
