/** Pulls a JSON object out of an LLM text response, tolerating markdown code fences and stray prose. */
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
      throw new Error("No JSON object found in AI response");
    }
    return JSON.parse(candidate.slice(start, end + 1));
  }
}
