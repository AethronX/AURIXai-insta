# Deployment

AURIX Social AI is a standard Next.js 16 app with a Postgres database and a persistent Node
process — it is **not** built around serverless/edge functions (Server Actions call external APIs
with real timeouts, and the publishing runner assumes it can complete a batch of jobs in one
invocation), so target a platform that runs a long-lived Node server rather than short-lived edge
functions.

## Build & run

```bash
npm run build
npm run db:deploy   # apply migrations (non-interactive, safe for CI/CD)
npm start
```

`next build` runs a real production build with Turbopack (Next.js 16 default) and fails on
lint/type errors baked into the build step. `npm run db:deploy` is `prisma migrate deploy` —
applies pending migrations without the interactive prompts `migrate dev` uses.

## Environment for production

Beyond the local-dev defaults (`docs/ENVIRONMENT.md`):

- `NODE_ENV=production`
- `APP_URL` — your real public HTTPS origin (used for OAuth redirects and, if using local storage,
  uploaded file URLs — see the storage note below)
- Generate fresh `AUTH_SECRET` and `CREDENTIALS_ENCRYPTION_KEY` — **do not reuse development
  values**
- Set a strong `AURIX_WEBHOOK_SECRET` — the default (`dev_webhook_secret_change_me`) is
  intentionally insecure so it's obvious if left unchanged
- Decide `MOCK_MODE`: keep `true` if you want unconnected brands to still be able to exercise the
  full pipeline; set `false` once you want an unconnected Instagram integration to fail loudly
  instead of silently publishing to the mock provider

## Storage

The default `local` storage provider writes to `public/uploads/` on the server's own filesystem.
This works for:
- A single-instance deployment where that filesystem persists across restarts
- Any deployment where `APP_URL` is itself the public HTTPS origin serving those files

It does **not** work for:
- Multi-instance/autoscaled deployments (each instance has its own disk — uploads on instance A
  aren't visible from instance B)
- Real Instagram publishing if `APP_URL` isn't publicly reachable

For either of those, implement an S3-compatible `StorageProvider` (the interface is
`lib/storage/provider.ts`; `getStorageProvider()` in `lib/storage/local-provider.ts` is the single
place to swap in a new implementation behind `STORAGE_PROVIDER=s3`).

## Database

Any managed PostgreSQL works (RDS, Cloud SQL, Neon, Supabase's Postgres, etc.). Nothing in the
schema uses Postgres-specific extensions beyond what Prisma's `postgresql` provider generates —
standard `Json`, enums, and foreign keys.

Run `npm run db:deploy` as a release step before starting new instances, not on every boot (avoid
concurrent migration races if you scale to multiple instances).

## Background work: the publishing runner and n8n

There is no built-in cron/scheduler inside the Next.js process. Scheduled publishing
(`runDuePublishingJobs`) and analytics sync are meant to be triggered externally:

- **Recommended**: n8n's Schedule Trigger calling `POST /api/webhooks/n8n` with
  `publishing.run_scheduled` every 5-15 minutes (see `docs/n8n/workflow-2-scheduled-publishing.md`)
- **Alternative**: any external scheduler (a platform cron job, GitHub Actions on a schedule, etc.)
  hitting the same authenticated endpoint

Don't rely on someone manually clicking "Run scheduled publishing now" in Settings in production —
that button exists for testing/demo purposes.

## Observability

- Structured JSON logs via `pino` (`lib/observability/logger.ts`) — pipe stdout to your log
  aggregator of choice; `LOG_LEVEL` controls verbosity
- Durable, queryable audit trail in the `audit_events` table (`lib/observability/audit.ts`) —
  every AI generation, approval, publish, and webhook event is recorded there independent of log
  retention
- `ai_jobs` and `webhook_events` tables give you a full history of every AI call and every n8n
  interaction, including failures, without needing external tooling

## Health checks

There is no dedicated `/api/health` route today. `GET /` (redirects to `/login` or `/dashboard`)
or `GET /api/content` (with the webhook bearer token) both exercise the database connection and
are reasonable liveness probes if your platform needs one.

## Rollback

Standard blue/green or rolling deployment works — the app has no in-memory state that matters
across requests (sessions are DB-backed, not in-memory). Rolling back to a previous build is safe
as long as you haven't also rolled back a migration that the new code's queries depend on; prefer
additive migrations (new nullable columns/tables) over destructive ones when you need a rollback
safety margin.
