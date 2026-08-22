# AI Configuration & Prompt System

Every generator/agent talks only to the `AIProvider` interface (`lib/ai/provider.ts`) — never to
a vendor SDK directly. `lib/ai/provider-registry.ts` is the single place that picks a concrete
implementation:

- `ClaudeProvider` (`lib/ai/claude-provider.ts`) — Anthropic, via `@anthropic-ai/sdk`.
- `GeminiProvider` (`lib/ai/gemini-provider.ts`) — Google, via `@google/genai`. Has a free tier
  for Flash models through a Google AI Studio key (aistudio.google.com/apikey) — no billing
  required to get started, unlike Claude's pay-as-you-go API.

## Configuration

Set `AI_PROVIDER` to `claude` or `gemini` — **required, no default** — then the matching key:
`ANTHROPIC_API_KEY` or `GEMINI_API_KEY`. See `docs/ENVIRONMENT.md` for per-task model selection
(`AI_MODEL_*` / `GEMINI_MODEL_*`) and the quality gate threshold.

**Without a key, every generator fails with a clear, typed error** (`AINotConfiguredError`,
surfaced to the UI as "\<Provider\> is not configured. Add \<ENV_VAR\> in Settings..."). Nothing
in this codebase fabricates AI output when the key is missing — the seed script
(`prisma/seed.ts`) exists precisely so the product can be demoed/tested without one, by writing
realistic example rows directly rather than pretending to have generated them.

**Without `AI_PROVIDER` itself set**, generation fails just as loudly with a distinct error —
"AI_PROVIDER is not configured..." (`PROVIDER_NOT_CONFIGURED`, thrown by `resolveAIProviderName()`
in `lib/env.ts`) — rather than silently resolving to `claude` and then failing with a "Claude is
not configured" message that looks like Claude was deliberately selected when it wasn't. This is
the one and only place that decides which provider name is active; `provider-registry.ts` and
`lib/ai/models.ts` both call it instead of re-deriving `AI_PROVIDER` themselves.

## Cost control

- **Task-based model selection** (`lib/ai/models.ts`): strategy generation and analytics insights
  (the tasks needing the most reasoning) use `AI_MODEL_STRATEGY`; everyday content generation and
  quality review use `AI_MODEL_CONTENT`; cheap high-volume tasks (caption rewrite, creative
  direction) use `AI_MODEL_FAST`.
- **Selective context, never a database dump.** `buildBrandContext()` (`lib/brand/context.ts`)
  retrieves only what's needed: the brand profile, up to 6 recent content pillars, the active
  strategy's summary, and the top ~12 brand-memory entries above the confidence floor — rendered
  into compact plain text (`renderBrandContext`), not raw JSON.
- **One repair retry, not infinite retries.** `generateValidatedJSON` (`lib/ai/structured-output.ts`)
  tries twice at most: once cleanly, once with the validation errors fed back. A third failure is
  a hard error, not a retry loop that burns tokens silently.

## The structured-output engine

Every generator funnels through the same pipeline:

```
generateText()            provider.generateText(), with responseSchema set to the caller's Zod schema
   → extractJson()          strips markdown fences, falls back to outermost {...}
   → schema.safeParse()     Zod validation against lib/validation/ai-schemas.ts
   → valid?
       ├── yes → store, mark AIJob SUCCEEDED
       └── no  → retry once with the validation errors appended to the prompt
                    → still invalid → mark AIJob FAILED, throw AIGenerationError
```

This is deliberately prompt-based JSON (strong system-prompt instructions + Zod validation)
rather than a tool-calling/JSON-schema-forced approach — simpler to reason about, and the repair
loop means a malformed first response is usually still recoverable. See
`tests/unit/structured-output.test.ts` for the exact behavior under a fake provider (no live API
key needed to verify this logic).

**GeminiProvider requests native JSON output.** Every call into `generateValidatedJSON` carries a
Zod schema, which `structured-output.ts` forwards to the provider as `GenerateTextParams.responseSchema`
(`lib/ai/provider.ts`). `GeminiProvider` uses that as a signal to set `responseMimeType:
"application/json"` on the `@google/genai` call (`lib/ai/gemini-provider.ts`) — this is what fixes
"No JSON object found in AI response": the model can no longer wrap its answer in prose or markdown
fences, which `extractJson()`'s fallback slicing couldn't always recover from. Deliberately *not*
also passing Gemini's schema-constrained modes (`responseSchema`/`responseJsonSchema`): both use
restricted, provider-specific schema dialects (a JSON-Schema keyword subset with no `pattern`/
`minLength`/property-scoped `$ref` for the latter; Google's own OpenAPI-subset `Schema` type, not
JSON Schema, for the former) that this codebase's Zod schemas — regex-constrained hex colors,
nullable ints, enum arrays — don't convert into safely without live-API verification. `ClaudeProvider`
ignores `responseSchema` entirely (Claude's structured output here stays prompt-based). Either way,
**Zod remains the only structural validator** — a provider's JSON-mode setting is a hint that
reduces malformed responses, never a replacement for `schema.safeParse()`.

### Error classification

Both providers map their SDK's HTTP status onto the same `AIErrorCode` (`lib/ai/provider.ts`, via
`classifyHttpStatus()`) instead of leaving callers to grep prose: `PROVIDER_NOT_CONFIGURED`,
`MODEL_NOT_FOUND` (e.g. Google's "this model is no longer available" 404),
`INVALID_API_KEY` (401), `PERMISSION_DENIED` (403), `RATE_LIMITED` (429), `INVALID_REQUEST` (400),
`NETWORK_ERROR` (5xx or a non-`ApiError` network failure), `MALFORMED_RESPONSE` (`extractJson()`
found no parseable JSON in the response at all — retryable, since the repair prompt often recovers
it), `SCHEMA_VALIDATION_FAILED` (valid JSON, but Zod rejected its shape), `UNKNOWN` (anything not
classified above). `generateValidatedJSON` carries the code through the retry loop, prefixes it
onto the persisted `AIJob.errorMessage` as
`[CODE] message`, and attaches it to the thrown `AIGenerationError.code` — never the raw
credential or full prompt, only provider name / model / job id / attempt / code. See
`tests/unit/ai-error-classification.test.ts` and the error-code cases in
`tests/unit/structured-output.test.ts`.

### No silent fallback

`lib/ai/provider-registry.ts` resolves exactly one provider from `AI_PROVIDER` and caches it —
there is no code path anywhere that catches a Gemini failure and retries with Claude (or vice
versa). A misconfigured or failing provider surfaces its own typed error; it never silently
degrades to the other vendor. See `tests/unit/provider-registry.test.ts`.

## Prompt library

`prompts/` — one directory per task, one file per version:

```
prompts/
├── shared.ts        CONTENT_GUARDRAILS (never invent facts, respect content rules, weight
│                    learned preferences) + jsonOnlyInstruction() — reused by every generator
├── strategy/v1.ts
├── content/post.v1.ts
├── carousel/v1.ts
├── caption/v1.ts
├── creative/v1.ts
├── review/v1.ts
└── analytics/v1.ts
```

Every prompt file exports a version string constant (e.g. `CAROUSEL_PROMPT_VERSION =
"carousel.v1"`), which is stored on the row it produces (`Content.promptVersion`,
`Strategy.promptVersion`, etc.). To iterate a prompt without losing the ability to explain past
output: add `prompts/carousel/v2.ts`, switch the generator to import it, bump the version string —
old content still records which prompt made it.

Every content-generation prompt includes `CONTENT_GUARDRAILS`:
- Never invent facts/prices/claims not present in the brand context — write a placeholder and list
  it in `assumptions` instead.
- Respect "never use / never claim / never discuss" exactly.
- Weight learned brand-memory preferences above generic best practice.
- JSON only, no commentary, no markdown fences.

## Quality review and the approval gate

`lib/ai/quality-reviewer.ts` scores content 0-100 across hook/clarity/value/brandFit/audienceFit/
originality/cta/visualDirection/accuracy/platformFit, and routes status to `PENDING_APPROVAL`
(score ≥ `AI_QUALITY_THRESHOLD` and the model's own `approved` flag) or `NEEDS_EDIT`.

**This never auto-publishes.** `PENDING_APPROVAL` still requires a human to click Approve
(`approveContentAction`) before scheduling is even possible — see the `ContentStatus` transition
table in `docs/DATABASE.md`.

## Self-improvement loop

```
Content → Published → Analytics → Analysis (AIInsight) → Learning → Strategy Update → Future Content
```

- `lib/ai/analytics-agent.ts` generates an `AIInsight` from real published-content performance,
  with confidence explicitly capped for small sample sizes (below ~8 published posts) both in the
  prompt and as a hard backstop in code.
- `lib/ai/optimization.ts`'s `applyInsight()` is the **only** path from an insight into brand
  memory/strategy, and it is always human-triggered (an Apply button on the Analytics page) —
  nothing calls it automatically. Below a 0.5 confidence floor, it refuses with
  `InsightConfidenceTooLowError` rather than silently biasing future generation off a weak signal.
- Rejection/change-request feedback follows the same confidence-reinforcement pattern
  (`lib/brand/memory.ts`) — a single rejection starts below the prompt-injection floor; only
  repeated feedback on the same theme becomes a strong enough preference to actually change future
  generations.

See `tests/integration/optimization.test.ts` and `tests/integration/brand-memory.test.ts` for
this behavior verified against real Postgres.
