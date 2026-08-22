# Environment Variables

All variables are validated at startup by `lib/env.ts` (Zod) — an invalid or missing required
variable fails fast with a clear message rather than surfacing as a confusing runtime error later.
See `.env.example` for the copy-paste template.

## App

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NODE_ENV` | No | `development` | `development` \| `test` \| `production` |
| `APP_URL` | No | `http://localhost:3000` | Used to build absolute URLs (OAuth redirect, uploaded file URLs) |
| `MOCK_MODE` | No | `true` | When `true`, Instagram publishing/analytics and image generation fall back to simulated providers whenever no real connection exists. Set `false` in production once real integrations are connected, if you want unconnected publishes to fail loudly instead of silently mocking. |

## Auth & security

| Variable | Required | Notes |
|---|---|---|
| `AUTH_SECRET` | **Yes** | 32+ char random string, used to derive session token hashes. `openssl rand -hex 32` |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string |
| `CREDENTIALS_ENCRYPTION_KEY` | **Yes** | Base64-encoded 32-byte key, AES-256-GCM-encrypts integration credentials (e.g. Instagram access tokens) at rest. `openssl rand -base64 32` |

## AI

| Variable | Required | Default | Notes |
|---|---|---|---|
| `AI_PROVIDER` | No | `claude` | `claude` \| `gemini` — which reasoning provider `lib/ai/provider-registry.ts` hands back. Only one is active at a time. |
| `ANTHROPIC_API_KEY` | No* | — | *Required when `AI_PROVIDER=claude` (the default) for any real generation. Without it, every AI generation action fails with a clear "Claude is not configured" error — never fake output. |
| `AI_MODEL_STRATEGY` | No | `claude-opus-4-5` | Claude model for strategy generation and the analytics agent — the two tasks that most benefit from stronger reasoning |
| `AI_MODEL_CONTENT` | No | `claude-sonnet-4-5` | Claude model for post/carousel generation and quality review |
| `AI_MODEL_FAST` | No | `claude-haiku-4-5` | Claude model for caption regeneration, creative direction — cheap, high-volume tasks |
| `GEMINI_API_KEY` | No* | — | *Required when `AI_PROVIDER=gemini`. Free tier available for Flash models — get a key at aistudio.google.com/apikey, no billing needed to start. Without it, same clean "Gemini is not configured" failure as Claude. |
| `GEMINI_MODEL_STRATEGY` / `GEMINI_MODEL_CONTENT` / `GEMINI_MODEL_FAST` | No | `gemini-2.5-flash` | Same per-task split as the Claude models, but only read when `AI_PROVIDER=gemini`. All default to the free-eligible Flash model — override any of them if you want a stronger (paid) Gemini model for a specific task. |
| `AI_QUALITY_THRESHOLD` | No | `85` | 0-100. AI review routes content to `PENDING_APPROVAL` at/above this score, `NEEDS_EDIT` below. Human approval is always still required to publish regardless of this value. |

## Image generation

| Variable | Required | Default | Notes |
|---|---|---|---|
| `IMAGE_PROVIDER` | No | `mock` | `mock` \| `external`. No real external provider is wired up yet — `lib/ai/image-provider.ts` defines the interface for one |
| `IMAGE_PROVIDER_API_KEY` | No | — | Only used once a real `external` provider is implemented |

## n8n

| Variable | Required | Notes |
|---|---|---|
| `N8N_BASE_URL` | No | Your n8n webhook trigger URL. Without it, outbound events are a documented no-op |
| `N8N_WEBHOOK_SECRET` | No | HMAC key AURIX signs outbound events with (`X-AURIX-Signature` header) |
| `AURIX_WEBHOOK_SECRET` | **Yes** (has an insecure default) | Bearer token n8n must send to AURIX's inbound webhook. Change the default (`dev_webhook_secret_change_me`) before any non-local deployment |

## Instagram / Meta

| Variable | Required | Notes |
|---|---|---|
| `META_APP_ID` | No | From developers.facebook.com |
| `META_APP_SECRET` | No | — |
| `META_REDIRECT_URI` | No | Defaults to `{APP_URL}/api/integrations/instagram/callback` |

Without these, the app runs entirely on `MockInstagramProvider` (or `MOCK_MODE=false` + no
connection → publishing fails with a clear "connection required" error). See `docs/INSTAGRAM.md`.

## Storage

| Variable | Required | Default | Notes |
|---|---|---|---|
| `STORAGE_PROVIDER` | No | `local` | `local` \| `s3`. Only `local` is implemented today (writes to `public/uploads/`) |
| `STORAGE_BUCKET` / `STORAGE_ACCESS_KEY_ID` / `STORAGE_SECRET_ACCESS_KEY` / `STORAGE_REGION` / `STORAGE_PUBLIC_URL` | No | — | Reserved for an S3-compatible implementation — required for real Instagram publishing, since Meta needs publicly reachable HTTPS image URLs (local storage only works if `APP_URL` itself is public) |

## Logging

| Variable | Required | Default | Notes |
|---|---|---|---|
| `LOG_LEVEL` | No | `info` | `fatal` \| `error` \| `warn` \| `info` \| `debug` \| `trace` |
