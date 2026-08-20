# Workflow 1 — Content generation request

```text
Trigger (Webhook / Slack command / manual)
   → Validate input
   → Call AURIX API (content.generate_requested)
   → Claude runs inside AURIX (strategy + brand memory retrieval, structured-output validation)
   → AURIX stores the result and returns it
   → Return result to the trigger source
```

## Purpose

Lets a non-AURIX-UI trigger (a Slack `/content` command, a form, a cron for "generate today's
idea") kick off content generation without duplicating AURIX's generation logic in n8n.

## Nodes

1. **Trigger** — Webhook node (or Slack Trigger). Expects `{ brandId, objective, format }`.
2. **Validate** — IF node: reject if `objective` is empty.
3. **HTTP Request → AURIX** — `POST {{$env.AURIX_BASE_URL}}/api/webhooks/n8n` with the envelope
   (`eventType: "content.generate_requested"`), `Authorization: Bearer {{$env.AURIX_WEBHOOK_SECRET}}`.
4. **Respond** — return `{ contentId }` (or the validation error) to the trigger source.

Import: [`workflows/workflow-1-content-generation.json`](workflows/workflow-1-content-generation.json)
