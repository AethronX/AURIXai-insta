# Workflow 3 — Analytics sync

```text
Schedule Trigger (daily)
   → AURIX: list published content missing recent metrics
   → Instagram Graph API: fetch insights per post (n8n calls Instagram directly)
   → Normalize into AURIX's metric shape
   → AURIX API (analytics.metrics_received) — store + trigger AI analysis
```

## Purpose

n8n calls the Instagram Graph API directly (n8n already has strong native Instagram/HTTP nodes
and credential management), normalizes the response, and pushes clean metrics into AURIX. AURIX
never talks to Instagram's Insights API itself in this workflow — it owns storage/normalization
and downstream AI analysis, not the external call.

## Nodes

1. **Schedule Trigger** — daily (e.g. 06:00).
2. **HTTP Request → AURIX** — `GET {{$env.AURIX_BASE_URL}}/api/content?status=PUBLISHED&brandId=...`
   (or maintain the list of `externalPostId`s in n8n from prior runs).
3. **Split In Batches** — one item per published post.
4. **HTTP Request → Instagram Graph API** — `GET /{{externalPostId}}/insights?metric=reach,impressions,saved,likes,comments,shares,profile_visits`,
   authenticated with the Page/IG access token stored in n8n credentials.
5. **Code (normalize)** — map Instagram's `{ data: [{ name, values }] }` shape into
   `{ contentId, metrics: { likes, comments, shares, saves, reach, impressions, profileVisits, followerDelta }, source: "instagram_graph" }`.
6. **HTTP Request → AURIX** — `POST {{$env.AURIX_BASE_URL}}/api/webhooks/n8n`,
   `eventType: "analytics.metrics_received"`, payload from step 5,
   `idempotencyKey: "analytics:{{contentId}}:{{$now.format('yyyy-MM-dd')}}"`.

Import: [`workflows/workflow-3-analytics-sync.json`](workflows/workflow-3-analytics-sync.json)

## Notes

Storing metrics automatically triggers `analytics.updated` back out to n8n (useful for chaining
into Workflow 4), and accumulates the history the AI Analytics Agent (`docs/AI.md`) reasons over.
