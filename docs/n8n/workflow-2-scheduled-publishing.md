# Workflow 2 — Scheduled publishing

```text
Schedule Trigger (every 5-15 minutes)
   → Call AURIX API (publishing.run_scheduled)
   → AURIX finds every due, approved+scheduled PublishingJob
   → AURIX publishes via the Instagram provider (real or mock) with retry/backoff
   → AURIX updates PublishingJob + Content status, stores externalPostId
   → AURIX emits content.published / content.publish_failed back to n8n
   → Notify (Slack/email) on failures
```

## Purpose

Runs on a timer and asks AURIX to execute anything due. AURIX owns all the actual publishing
logic (finding due jobs, calling Instagram, retry/backoff, idempotency) — n8n's job here is just
to be the clock and to relay failure notifications.

## Nodes

1. **Schedule Trigger** — every 5-15 minutes.
2. **HTTP Request → AURIX** — `POST {{$env.AURIX_BASE_URL}}/api/webhooks/n8n`,
   `eventType: "publishing.run_scheduled"`, `idempotencyKey: "publishing-run:{{$now.format('yyyy-MM-dd-HH-mm')}}"`
   (stable per trigger tick so a retry never double-runs), `Authorization: Bearer {{$env.AURIX_WEBHOOK_SECRET}}`.
3. **IF** — branch on `{{$json.data.failed > 0}}`.
4. **Notify (Slack/Email)** — only on the failed branch, summarizing `{{$json.data}}`.

Import: [`workflows/workflow-2-scheduled-publishing.json`](workflows/workflow-2-scheduled-publishing.json)

## Notes

- AURIX's `PublishingJob.idempotencyKey` and the `webhook_events` dedup table mean this workflow
  is safe to run more often than your publishing cadence, and safe to manually re-trigger.
- Real Instagram publishing requires `image_url`s the Graph API can fetch over public HTTPS — see
  `docs/INSTAGRAM.md`. Without a connected Instagram integration (and with `MOCK_MODE=true`),
  jobs still run end-to-end against the mock provider so this workflow can be built and tested
  before Instagram credentials exist.
