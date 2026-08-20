# n8n Integration

n8n is AURIX's automation/orchestration layer. Business logic (content generation, quality
review, publishing state transitions, analytics normalization) lives in the AURIX application
and is unit/integration-tested there — n8n never contains business logic itself. Its job is
scheduling, external API calls to Instagram/Meta, and notifications.

## Contract

### Outbound: AURIX → n8n

When something happens in AURIX, it POSTs a signed event to a single n8n Webhook Trigger URL
(`N8N_BASE_URL`). Configure this in n8n as one Webhook node with an IF/Switch node routing on
`eventType`.

Every outbound request:

```http
POST {N8N_BASE_URL}
Content-Type: application/json
X-AURIX-Event: content.approved
X-AURIX-Signature: sha256=<hmac-sha256 of the raw body, keyed with N8N_WEBHOOK_SECRET>

{
  "eventType": "content.approved",
  "eventId": "b3f1...",
  "idempotencyKey": "content.approved:b3f1...",
  "timestamp": "2026-08-20T09:00:00.000Z",
  "payload": { "contentId": "..." }
}
```

Verify the signature in n8n with a Code node before acting on the payload:

```js
const crypto = require('crypto');
const expected = 'sha256=' + crypto
  .createHmac('sha256', $env.AURIX_WEBHOOK_SECRET)
  .update(JSON.stringify($json))
  .digest('hex');
if (expected !== $request.headers['x-aurix-signature']) {
  throw new Error('Invalid signature');
}
```

Event types (see `lib/n8n/events.ts`, the single source of truth):

| Event | Fires when | Payload |
|---|---|---|
| `content.created` | New post/carousel generated | `{ contentId, brandId, format, title }` |
| `content.approved` | Human approves content | `{ contentId }` |
| `content.scheduled` | Content scheduled | `{ contentId, scheduledFor, provider }` |
| `content.publish_requested` | Publishing job starts | `{ contentId, jobId }` |
| `content.published` | Publish succeeded | `{ contentId, jobId, externalPostId, mock }` |
| `content.publish_failed` | Publish failed permanently | `{ contentId, jobId, message }` |
| `analytics.sync_requested` | An analytics sync is requested | `{ brandId }` |
| `analytics.updated` | New metrics stored | `{ brandId, contentId, metricId }` |

If `N8N_BASE_URL`/`N8N_WEBHOOK_SECRET` are unset, emission is a documented no-op (logged, not
retried) — it never blocks the primary action (e.g. approving content always succeeds even if
notifying n8n fails).

### Inbound: n8n → AURIX

Single endpoint: `POST {APP_URL}/api/webhooks/n8n`.

Required header: `Authorization: Bearer {AURIX_WEBHOOK_SECRET}`.

Required body shape:

```json
{
  "eventType": "publishing.run_scheduled",
  "eventId": "<uuid n8n generates per execution>",
  "idempotencyKey": "<stable per logical event — replays are deduplicated by this>",
  "timestamp": "2026-08-20T09:00:00.000Z",
  "payload": { }
}
```

`idempotencyKey` is stored in `webhook_events` with a unique constraint — a replay (same key)
returns `{ ok: true, data: { deduplicated: true } }` without reprocessing. Use a value derived
from the trigger, e.g. `publishing-run:${$now.format('yyyy-MM-dd-HH')}` for an hourly schedule
trigger, so a workflow retry never double-publishes.

Inbound event types AURIX handles today:

| Event | Payload | What AURIX does |
|---|---|---|
| `content.generate_requested` | `{ brandId, format, objective, contentPillarId? }` | Runs the strategy-aware content/carousel generator, returns `{ contentId }` |
| `publishing.run_scheduled` | `{}` | Finds every due `PublishingJob` (QUEUED past its time, or RETRYING past its backoff) and publishes it. Returns `{ processed, published, failed, retrying }` |
| `analytics.metrics_received` | see `lib/validation/analytics.ts` | Stores a normalized metrics snapshot for one piece of content |
| `analytics.analyze_requested` | `{ brandId }` | Runs the AI Analytics Agent and stores/returns a new `AIInsight` |

Unknown event types return `400` with a clear message — never silently ignored.

## Workflows

Full specs and importable JSON templates for the five workflows are in `docs/n8n/`:

1. [Content generation request](n8n/workflow-1-content-generation.md)
2. [Scheduled publishing](n8n/workflow-2-scheduled-publishing.md)
3. [Analytics sync](n8n/workflow-3-analytics-sync.md)
4. [Performance analysis](n8n/workflow-4-performance-analysis.md)
5. [Failure handling](n8n/workflow-5-failure-handling.md)

Importable JSON lives alongside each spec in `docs/n8n/workflows/*.json` — in n8n, use
**Import from File** (or paste into **Import from URL/Clipboard**). Each template has HTTP
Request nodes pre-filled with the AURIX endpoint paths; you only need to set the `AURIX_BASE_URL`,
`AURIX_WEBHOOK_SECRET`, and (for real publishing) Meta Graph API credentials as n8n environment
variables / credentials.

## Setting AURIX's own env for n8n

```bash
N8N_BASE_URL=https://your-n8n-instance.example.com/webhook/aurix-events
N8N_WEBHOOK_SECRET=<shared secret used for the HMAC signature above>
AURIX_WEBHOOK_SECRET=<bearer token n8n must send to AURIX's inbound endpoint>
```

These are two different secrets on purpose: one authenticates AURIX → n8n, the other n8n → AURIX.
