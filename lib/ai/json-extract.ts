import { AIProviderError } from "@/lib/ai/provider";

/** Pulls a JSON object out of an LLM text response, tolerating markdown code fences and stray prose.
 * A provider asked for native JSON output (see GeminiProvider's responseMimeType) should hit the
 * first JSON.parse directly; this fallback exists for providers/models that only obey prompt
 * instructions to "return JSON" rather than an SDK-level guarantee. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;

  try {
    return JSON.parse(candidate.trim());
  } catch {
    // Fall back to the outermost {...} slice — handles cases where the model added
    // a sentence before/after the JSON despite instructions not to.
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new AIProviderError("No JSON object found in AI response", {
        code: "MALFORMED_RESPONSE",
        retryable: true,
      });
    }
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch (err) {
      throw new AIProviderError("AI response contained a { ... } slice that is not valid JSON", {
        cause: err,
        code: "MALFORMED_RESPONSE",
        retryable: true,
      });
    }
  }
}
