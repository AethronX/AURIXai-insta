# Architecture

## High level

```
                    AURIX Social AI
                           |
                    Web Application (Next.js 16, App Router)
                           |
              +------------+------------+
              |                         |
        Brand Intelligence        Content Workspace
        (onboarding, brand        (calendar, content
         memory, context)          studio, approval)
              |                         |
              +------------+------------+
                           |
                     AI Service Layer  (lib/ai/*)
                     AIProvider / ImageProvider interfaces
                           |
                     Claude (ClaudeProvider)  +  MockImageProvider
                           |
                     Application Logic (lib/**, services in lib/actions)
                           |
                     PostgreSQL / Prisma
                           |
                 Automation Integration (lib/n8n)
                           |
                         n8n
                           |
          +----------------+----------------+
          |                |                |
       Research        Scheduling       Publishing
      (n8n workflow)  (n8n Schedule    (lib/publishing/runner.ts,
                        Trigger ->       lib/social/*)
                        publishing.run_scheduled)
          |                |                |
          +----------------+----------------+
                           |
                     Instagram/Meta (Graph API, or mock)
                           |
                       Analytics (lib/analytics/*)
                           |
                     AI Insights (lib/ai/analytics-agent.ts)
                           |
                  Strategy Optimization (lib/ai/optimization.ts)
```

## Why this shape

**Provider interfaces at every external boundary.** `AIProvider` (`lib/ai/provider.ts`),
`ImageProvider` (`lib/ai/image-provider.ts`), `SocialPlatformProvider` (`lib/social/provider.ts`),
and `StorageProvider` (`lib/storage/provider.ts`) each have exactly one real implementation today
(Claude, a mock SVG renderer, Instagram Graph API + mock, local disk) and a documented seam for a
second. No business logic anywhere imports a vendor SDK directly except inside these providers.

**Business logic lives in `lib/`, not in Server Components or Server Actions.** Pages
(`app/**/page.tsx`) and actions (`lib/actions/*.ts`) are thin — they resolve the session, call a
`lib/**` service function, and render/return. This is what makes the service layer independently
unit/integration-testable (see `tests/`) without spinning up Next.js.

**AI generation always goes through one choke point.** Every generator (strategy, post, carousel,
caption, creative brief, quality review, analytics insight) calls
`generateValidatedJSON()` (`lib/ai/structured-output.ts`), which handles model selection, the
Zod-validate-or-repair loop, and `AIJob` observability rows. No generator hand-rolls its own
prompt-to-database pipeline.

**Multi-tenancy is structural, not bolted on.** Every business entity hangs off
`Organization -> Brand`, even though the UI only ever shows one brand per organization today
(`lib/brand/service.ts`'s `getPrimaryBrand`). Turning on multi-brand support later is a UI change
(a brand switcher) and an authorization change (scope every query to the selected brand, which
they already are) — not a schema migration.

**Human approval is a hard gate, never bypassable.** The `ContentStatus` state machine
(`lib/content/status.ts`) has no transition from `PENDING_APPROVAL` to `SCHEDULED` — only through
`APPROVED`, which only `approveContentAction` (a human-triggered Server Action) can set. AI
quality review can route content to `PENDING_APPROVAL` or back to `NEEDS_EDIT`; it cannot approve.

## Directory layout

```
app/                    Next.js App Router — route groups: (auth), (dashboard); app/api/* for
                         n8n webhooks + OAuth callback
components/              UI, organized by domain (brand/, content/, analytics/, strategy/,
                         settings/, calendar/) plus components/ui/ design system primitives
lib/
  actions/               Server Actions — thin orchestration, calls into lib/** services
  ai/                    AIProvider + all generators (strategy, content, carousel, caption,
                         creative, quality review, analytics agent, optimization)
  analytics/             Metrics ingestion, sync, aggregation/leaderboard logic
  brand/                 Brand CRUD, brand memory, brand-context builder for prompts
  calendar/               Calendar read model
  content/               Content status state machine, versioning
  n8n/                   Event contract + outbound client
  observability/         Structured logging (pino) + durable audit trail (AuditEvent)
  publishing/             The scheduled-job runner (retry/backoff)
  security/               Auth (sessions, bcrypt), credential encryption, webhook auth
  social/                 SocialPlatformProvider + Instagram (Graph API + mock)
  storage/                StorageProvider + local disk implementation
  validation/             Zod schemas — AI outputs, brand forms, webhooks, analytics payloads
prompts/                  Versioned prompt templates (one file per task per version)
prisma/                   schema.prisma, migrations/, seed.ts
tests/                    unit/ (pure logic, mocked I/O), integration/ (real Postgres),
                          e2e/ (Playwright against a running server)
docs/                     This documentation set + docs/n8n/ workflow specs and JSON templates
```

## Request flow example: generating a carousel

1. User submits the Content Studio "Generate with AI" form → client component calls
   `generateCarouselAction` (`lib/actions/ai-actions.ts`), a Server Action.
2. The action resolves the session (`requireUser`) and the brand, then calls
   `generateCarousel()` (`lib/ai/content-generator.ts`).
3. `generateCarousel` builds a `BrandContext` (`lib/brand/context.ts` — selective retrieval, not a
   full-database dump), renders it into the `carousel.v1` prompt (`prompts/carousel/v1.ts`), and
   calls `generateValidatedJSON`.
4. `generateValidatedJSON` creates an `AIJob` row, calls `ClaudeProvider.generateText`, extracts +
   Zod-validates the JSON, repairs once on failure, marks the job SUCCEEDED/FAILED.
5. On success, a `Content` row (`status: DRAFT`) and its first `ContentVersion` snapshot are
   created; an outbound `content.created` event fires to n8n (best-effort, never blocking).
6. The action revalidates `/content` and `/calendar`; the UI redirects to the new content's detail
   page.

Every subsequent step (creative brief, image generation, quality review, approve, schedule,
publish, analytics sync, insight generation, apply-insight) follows the same shape: a thin action,
a `lib/**` service function, a database write, an optional outbound n8n event.
