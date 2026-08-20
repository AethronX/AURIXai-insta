# Database

PostgreSQL + Prisma. Full schema: `prisma/schema.prisma`. Migrations: `prisma/migrations/`.

## Entity map

```
Organization ──< Membership >── User ──< Session
     │
     └──< Brand ──< BrandAudience (1:1)
            ├──< BrandVoice (1:1)
            ├──< BrandVisualIdentity (1:1)
            ├──< BrandContentRules (1:1)
            ├──< BrandMemoryEntry (learned preferences, confidence-scored)
            ├──< Strategy ──< ContentPillar
            ├──< Campaign
            ├──< CalendarItem ──1:1── Content
            ├──< Content ──< ContentVersion
            │        ├──< ContentAsset (images / design briefs)
            │        ├──< QualityReview
            │        ├──< ApprovalEvent
            │        ├──< PublishingJob
            │        └──< AnalyticsMetric
            ├──< Integration (Instagram / n8n / image provider connections)
            └──< AIInsight

AIJob, WebhookEvent, AuditEvent — cross-cutting observability, linked loosely to
Organization/Brand (nullable FKs — observability must survive brand/org deletion for audit trail).
```

## Why this shape

**`Organization -> Brand` from day one.** Even though v1's UI only ever shows a user's first brand
(`getPrimaryBrand`), every business entity is scoped to a `Brand`, which is scoped to an
`Organization`. Multi-brand and multi-org support later needs a brand switcher and query-scoping
UI, not a schema migration.

**`Content.body` is a typed `Json` escape hatch, everything else is a real column.** Fields every
piece of content has regardless of format (`title`, `hook`, `caption`, `cta`, `hashtags`, `status`)
are real, queryable, indexable columns. Format-specific structure (carousel slides, a post's
`visualDirection`/`assumptions`) lives in `body`, validated by Zod at the application boundary
(`lib/validation/ai-schemas.ts`) rather than the database — this avoids a wide table with dozens of
nullable format-specific columns while keeping the common case fully relational.

**`BrandMemoryEntry` is structured, not a vector store.** Per spec: "Build this as structured data
first. Do not introduce unnecessary vector databases unless there is a real requirement." Each row
is `{ key, insight, confidence, source }` — a small, attributable fact, not a blob. Repeated
feedback on the same theme (bucketed by `key`) raises `confidence` instead of creating unbounded
duplicates (see `lib/brand/memory.ts`). This also makes brand memory fully SQL-queryable and
auditable in a way an embedding store wouldn't be.

**Every content generation records its prompt version.** `Content.promptVersion`,
`Strategy.promptVersion`, `QualityReview.promptVersion`, `AIInsight.promptVersion` — each links back
to the exact prompt template version used (`prompts/*/v1.ts` etc.), so prompt changes never lose
the ability to explain why older content looks the way it does.

**`ContentStatus` enum + `lib/content/status.ts` transition table is the single source of truth**
for the content lifecycle state machine (`IDEA → DRAFT → AI_REVIEW → NEEDS_EDIT/PENDING_APPROVAL →
APPROVED → SCHEDULED → PUBLISHING → PUBLISHED/FAILED → ARCHIVED`). Every status-changing action
checks `canTransition()` before writing — see the state machine tests in
`tests/unit/content-status.test.ts`.

**Idempotency is a database constraint, not a convention.** `WebhookEvent.idempotencyKey` and
`PublishingJob.idempotencyKey` are both `@unique` — a duplicate n8n webhook delivery or a
duplicate publish attempt is rejected at the database layer, not just "usually" deduplicated in
application code.

## Migrations

```bash
npm run db:migrate      # create + apply a new migration in development
npm run db:deploy       # apply pending migrations in production (no schema drift prompts)
npm run db:studio       # Prisma Studio — browse/edit data visually
```

`prisma/migrations/20260820092129_init/` is the single migration so far — the full schema was
designed up front (see `docs/IMPLEMENTATION_PLAN.md`) rather than evolved incrementally, since this
was a greenfield build.

## Prisma client naming quirk

Models named with a leading acronym (`AIJob`, `AIInsight`) generate camelCase client accessors as
`prisma.aIJob` / `prisma.aIInsight` (Prisma lowercases only the first character, not the whole
leading acronym). This is intentional upstream Prisma behavior, not a typo in this codebase —
searchable in `lib/ai/structured-output.ts` and `lib/ai/analytics-agent.ts` if you need a working
example.
