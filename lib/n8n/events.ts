/** Lifecycle events AURIX emits outbound to n8n. Keep this list in sync with docs/N8N.md. */
export const N8N_EVENTS = {
  CONTENT_CREATED: "content.created",
  CONTENT_APPROVED: "content.approved",
  CONTENT_SCHEDULED: "content.scheduled",
  CONTENT_PUBLISH_REQUESTED: "content.publish_requested",
  CONTENT_PUBLISHED: "content.published",
  CONTENT_PUBLISH_FAILED: "content.publish_failed",
  ANALYTICS_SYNC_REQUESTED: "analytics.sync_requested",
  ANALYTICS_UPDATED: "analytics.updated",
} as const;

export type N8nEventType = (typeof N8N_EVENTS)[keyof typeof N8N_EVENTS];

/** Event types n8n is expected to send inbound to POST /api/webhooks/n8n. */
export const N8N_INBOUND_EVENTS = {
  CONTENT_GENERATE_REQUESTED: "content.generate_requested",
  PUBLISHING_RUN_SCHEDULED: "publishing.run_scheduled",
  ANALYTICS_METRICS_RECEIVED: "analytics.metrics_received",
  ANALYTICS_ANALYZE_REQUESTED: "analytics.analyze_requested",
} as const;

export type N8nInboundEventType = (typeof N8N_INBOUND_EVENTS)[keyof typeof N8N_INBOUND_EVENTS];
