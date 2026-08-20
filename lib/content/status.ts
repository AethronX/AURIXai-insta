import type { ContentStatus } from "@prisma/client";

export const CONTENT_STATUS_ORDER: ContentStatus[] = [
  "IDEA",
  "DRAFT",
  "AI_REVIEW",
  "NEEDS_EDIT",
  "PENDING_APPROVAL",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHING",
  "PUBLISHED",
  "FAILED",
  "ARCHIVED",
];

export const CONTENT_STATUS_LABEL: Record<ContentStatus, string> = {
  IDEA: "Idea",
  DRAFT: "Draft",
  AI_REVIEW: "AI Review",
  NEEDS_EDIT: "Needs Edit",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  SCHEDULED: "Scheduled",
  PUBLISHING: "Publishing",
  PUBLISHED: "Published",
  FAILED: "Failed",
  ARCHIVED: "Archived",
};

export const CONTENT_STATUS_TONE: Record<
  ContentStatus,
  "neutral" | "brand" | "success" | "warning" | "danger" | "info"
> = {
  IDEA: "neutral",
  DRAFT: "neutral",
  AI_REVIEW: "info",
  NEEDS_EDIT: "warning",
  PENDING_APPROVAL: "warning",
  APPROVED: "success",
  SCHEDULED: "brand",
  PUBLISHING: "info",
  PUBLISHED: "success",
  FAILED: "danger",
  ARCHIVED: "neutral",
};

/** Valid forward transitions for the content lifecycle state machine. */
export const CONTENT_STATUS_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  IDEA: ["DRAFT", "ARCHIVED"],
  DRAFT: ["AI_REVIEW", "ARCHIVED"],
  AI_REVIEW: ["NEEDS_EDIT", "PENDING_APPROVAL", "ARCHIVED"],
  NEEDS_EDIT: ["DRAFT", "AI_REVIEW", "ARCHIVED"],
  PENDING_APPROVAL: ["APPROVED", "NEEDS_EDIT", "ARCHIVED"],
  APPROVED: ["SCHEDULED", "NEEDS_EDIT", "ARCHIVED"],
  SCHEDULED: ["PUBLISHING", "APPROVED", "ARCHIVED"],
  PUBLISHING: ["PUBLISHED", "FAILED"],
  PUBLISHED: ["ARCHIVED"],
  FAILED: ["SCHEDULED", "NEEDS_EDIT", "ARCHIVED"],
  ARCHIVED: [],
};

export function canTransition(from: ContentStatus, to: ContentStatus): boolean {
  return CONTENT_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
