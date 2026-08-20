# Workflow 5 — Failure handling

```text
Error (from any AURIX webhook call, or content.publish_failed event)
   → Log
   → Retry (only for transient errors)
   → Retry with backoff
   → Notify
   → Mark failed
```

## Purpose

A cross-cutting pattern rather than a single trigger: every HTTP Request node calling AURIX in
Workflows 1-4 should use this error path instead of letting n8n's default retry silently spin.

## Nodes (attach to any HTTP Request → AURIX node via "On Error → Continue")

1. **On Error output** of the HTTP Request node → **Code (log)** — record `$json`, the node name,
   and the execution ID.
2. **IF** — branch on whether the AURIX response was a `5xx`/network error (transient — retryable)
   vs a `4xx` (validation/auth — not retryable, e.g. a malformed payload will never succeed on
   retry).
3. **Retryable branch** → **Wait** (exponential: 30s, 2m, 10m across up to 3 attempts, using an
   execution-scoped counter in a Set node) → loop back to the HTTP Request node.
4. **Exhausted retries, or non-retryable branch** → **Notify (Slack/Email)** with the error detail
   → **NoOp "Mark failed"** node as an explicit terminal state (so the execution list clearly shows
   failures instead of a silent stop).

Import: [`workflows/workflow-5-failure-handling.json`](workflows/workflow-5-failure-handling.json)
(a standalone Error Trigger workflow you can set as the **Error Workflow** on Workflows 1-4 in
their workflow settings, so every one of them reports through the same path).

## Notes

- AURIX's own publishing runner (`lib/publishing/runner.ts`) already does exponential backoff
  (2m/10m/30m) and a max-attempts cutoff *inside* AURIX for publishing specifically — this
  n8n-level retry is for the *call to AURIX itself* failing (network blip, AURIX briefly down),
  a different failure mode.
- Never retry a `400` (validation) response — the payload is wrong, not transient; fix the
  workflow instead of hammering AURIX.
