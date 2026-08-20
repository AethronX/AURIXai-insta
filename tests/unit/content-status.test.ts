import { describe, expect, it } from "vitest";
import { canTransition, CONTENT_STATUS_ORDER, CONTENT_STATUS_TRANSITIONS } from "@/lib/content/status";
import type { ContentStatus } from "@prisma/client";

describe("content status state machine", () => {
  it("allows the documented happy path from idea through published", () => {
    const happyPath: ContentStatus[] = [
      "IDEA",
      "DRAFT",
      "AI_REVIEW",
      "PENDING_APPROVAL",
      "APPROVED",
      "SCHEDULED",
      "PUBLISHING",
      "PUBLISHED",
    ];
    for (let i = 0; i < happyPath.length - 1; i++) {
      expect(canTransition(happyPath[i], happyPath[i + 1])).toBe(true);
    }
  });

  it("rejects skipping human approval — APPROVED cannot jump straight to PUBLISHING", () => {
    expect(canTransition("APPROVED", "PUBLISHING")).toBe(false);
  });

  it("rejects publishing content that was never approved", () => {
    expect(canTransition("PENDING_APPROVAL", "PUBLISHED")).toBe(false);
    expect(canTransition("DRAFT", "PUBLISHED")).toBe(false);
  });

  it("PUBLISHED is a terminal state except for archiving", () => {
    expect(CONTENT_STATUS_TRANSITIONS.PUBLISHED).toEqual(["ARCHIVED"]);
  });

  it("ARCHIVED has no outgoing transitions", () => {
    expect(CONTENT_STATUS_TRANSITIONS.ARCHIVED).toEqual([]);
  });

  it("every status in the transition table is a real Prisma enum value", () => {
    for (const status of Object.keys(CONTENT_STATUS_TRANSITIONS)) {
      expect(CONTENT_STATUS_ORDER).toContain(status);
    }
  });

  it("a rejected NEEDS_EDIT item can be revised and re-reviewed, not just archived", () => {
    expect(canTransition("NEEDS_EDIT", "DRAFT")).toBe(true);
    expect(canTransition("NEEDS_EDIT", "AI_REVIEW")).toBe(true);
  });
});
