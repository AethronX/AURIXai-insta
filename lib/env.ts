import { z } from "zod";
import { AIProviderError } from "@/lib/ai/provider";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  MOCK_MODE: z
    .string()
    .default("true")
    .transform((v) => v === "true"),

  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  DATABASE_URL: z.string().min(1),
  CREDENTIALS_ENCRYPTION_KEY: z.string().min(1),

  // Which reasoning provider lib/ai/provider-registry.ts hands back — "claude" needs
  // ANTHROPIC_API_KEY, "gemini" needs GEMINI_API_KEY. Business logic never picks a provider
  // directly; only this setting does (see docs/AI.md). Deliberately no `.default("claude")`: a
  // missing/misconfigured AI_PROVIDER must fail loudly via resolveAIProviderName() below, never
  // silently resolve to "claude" and masquerade as a deliberate choice.
  AI_PROVIDER: z.enum(["claude", "gemini"]).optional(),

  ANTHROPIC_API_KEY: z.string().optional().default(""),
  AI_MODEL_STRATEGY: z.string().default("claude-opus-4-5"),
  AI_MODEL_CONTENT: z.string().default("claude-sonnet-4-5"),
  AI_MODEL_FAST: z.string().default("claude-haiku-4-5"),

  // Gemini Developer API key from Google AI Studio (aistudio.google.com/apikey) — has a free
  // tier for Flash models. Only used when AI_PROVIDER=gemini.
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL_STRATEGY: z.string().default("gemini-3.6-flash"),
  GEMINI_MODEL_CONTENT: z.string().default("gemini-3.6-flash"),
  GEMINI_MODEL_FAST: z.string().default("gemini-3.6-flash"),

  IMAGE_PROVIDER: z.enum(["mock", "external"]).default("mock"),
  IMAGE_PROVIDER_API_KEY: z.string().optional().default(""),

  N8N_BASE_URL: z.string().optional().default(""),
  N8N_WEBHOOK_SECRET: z.string().optional().default(""),
  AURIX_WEBHOOK_SECRET: z.string().default("dev_webhook_secret_change_me"),

  META_APP_ID: z.string().optional().default(""),
  META_APP_SECRET: z.string().optional().default(""),
  META_REDIRECT_URI: z.string().optional().default(""),

  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  STORAGE_BUCKET: z.string().optional().default(""),
  STORAGE_ACCESS_KEY_ID: z.string().optional().default(""),
  STORAGE_SECRET_ACCESS_KEY: z.string().optional().default(""),
  STORAGE_REGION: z.string().optional().default(""),
  STORAGE_PUBLIC_URL: z.string().optional().default(""),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  // Quality gate: AI review approval threshold (0-100). Human approval is still always required
  // to publish — this only controls whether AI review routes content to PENDING_APPROVAL or
  // NEEDS_EDIT.
  AI_QUALITY_THRESHOLD: z.coerce.number().min(0).max(100).default(85),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/** Validated, typed process.env. Throws with a clear message on misconfiguration. */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export const isInstagramConfigured = (): boolean => {
  const env = getEnv();
  return Boolean(env.META_APP_ID && env.META_APP_SECRET);
};

export const isImageProviderConfigured = (): boolean => {
  const env = getEnv();
  return env.IMAGE_PROVIDER === "external" && Boolean(env.IMAGE_PROVIDER_API_KEY);
};

export const isClaudeConfigured = (): boolean => Boolean(getEnv().ANTHROPIC_API_KEY);

export const isGeminiConfigured = (): boolean => Boolean(getEnv().GEMINI_API_KEY);

/**
 * The ONE authoritative provider-resolution check (lib/ai/provider-registry.ts and
 * lib/ai/models.ts both call this — no other file re-derives which provider is active). Throws a
 * typed, diagnosable AIProviderError instead of silently defaulting to "claude" when AI_PROVIDER
 * is unset, so a missing env var surfaces as "AI_PROVIDER is not configured" — not as a misleading
 * "Claude is not configured" that looks like Claude was deliberately chosen.
 */
export function resolveAIProviderName(): "claude" | "gemini" {
  const raw = getEnv().AI_PROVIDER;
  if (raw === "claude" || raw === "gemini") return raw;
  throw new AIProviderError(
    "AI_PROVIDER is not configured. Set AI_PROVIDER=claude or AI_PROVIDER=gemini in your environment (see docs/ENVIRONMENT.md) — no provider is assumed by default.",
    { retryable: false, code: "PROVIDER_NOT_CONFIGURED" }
  );
}

/** Whether the currently-selected AI_PROVIDER has its credential set. Never throws — an unset
 * AI_PROVIDER is reported as simply "not configured" for UI badges rather than an error. */
export const isAIProviderConfigured = (): boolean => {
  const env = getEnv();
  if (env.AI_PROVIDER === "gemini") return isGeminiConfigured();
  if (env.AI_PROVIDER === "claude") return isClaudeConfigured();
  return false;
};

export const isN8nConfigured = (): boolean => {
  const env = getEnv();
  return Boolean(env.N8N_BASE_URL && env.N8N_WEBHOOK_SECRET);
};
