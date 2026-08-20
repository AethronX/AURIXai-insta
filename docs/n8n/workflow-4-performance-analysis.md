# Workflow 4 — Performance analysis

```text
Analytics updated (triggered by Workflow 3, or on a weekly schedule)
   → AURIX: AI Analytics Agent runs (Claude) over recent published content + metrics
   → Identify winners / losers, generate insights + recommendations
   → AURIX stores an AIInsight row, updates strategy recommendations (confidence-gated)
   → Notify the operator that new insights are ready
```

## Purpose

Turns raw metrics into the recommendations shown on `/analytics` and the dashboard. The actual
reasoning happens inside AURIX (`lib/analytics/insights-agent.ts`) so it's testable and reuses
brand context the same way content generation does — n8n's role is scheduling + notification.

## Nodes

1. **Trigger** — Webhook (chained from Workflow 3's outbound `analytics.updated` event) or a
   weekly Schedule Trigger as a fallback cadence.
2. **HTTP Request → AURIX** — `POST {{$env.AURIX_BASE_URL}}/api/webhooks/n8n`,
   `eventType: "analytics.analyze_requested"`, `payload: { brandId }`. AURIX runs the AI
   Analytics Agent (`lib/ai/analytics-agent.ts`) and returns `{ summary, recommendations, ... }`.
   The same generation is also reachable from the Analytics page's "Generate insights" button —
   this workflow just automates it.
3. **Notify (Slack/Email)** — post the returned `summary` + top recommendation.

Import: [`workflows/workflow-4-performance-analysis.json`](workflows/workflow-4-performance-analysis.json)

## Notes

Insight confidence is capped low automatically for small sample sizes (see the prompt in
`prompts/analytics/v1.ts`), and AURIX never rewrites brand rules from a single insight — see
`docs/AI.md` § self-improvement loop.
