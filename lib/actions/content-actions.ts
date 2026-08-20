"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/auth";
import { getPrimaryBrand } from "@/lib/brand/service";
import { prisma } from "@/lib/db";
import { canTransition } from "@/lib/content/status";
import { createNextVersion } from "@/lib/content/versions";
import { recordFeedbackMemory } from "@/lib/brand/memory";
import { recordAuditEvent } from "@/lib/observability/audit";
import { emitN8nEvent } from "@/lib/n8n/client";
import { N8N_EVENTS } from "@/lib/n8n/events";
import type { ActionResult } from "@/lib/actions/ai-actions";

async function requireContentOwnership(contentId: string) {
  const user = await requireUser();
  const content = await prisma.content.findUniqueOrThrow({ where: { id: contentId } });
  const brand = await getPrimaryBrand(user.organizationId);
  if (!brand || brand.id !== content.brandId) {
    throw new Error("Not authorized for this content.");
  }
  return { user, content, brand };
}

function revalidateContent(contentId: string) {
  revalidatePath(`/content/${contentId}`);
  revalidatePath("/content");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function approveContentAction(contentId: string): Promise<ActionResult> {
  try {
    const { user, content } = await requireContentOwnership(contentId);
    if (!canTransition(content.status, "APPROVED")) {
      return { ok: false, error: `Cannot approve content in status ${content.status}.` };
    }
    await prisma.$transaction([
      prisma.content.update({ where: { id: contentId }, data: { status: "APPROVED", rejectionReason: null } }),
      prisma.approvalEvent.create({ data: { contentId, userId: user.id, action: "APPROVE" } }),
    ]);
    await recordAuditEvent({ category: "publishing", action: "content.approved", organizationId: user.organizationId, actorId: user.id, metadata: { contentId } });
    void emitN8nEvent({ eventType: N8N_EVENTS.CONTENT_APPROVED, organizationId: user.organizationId, payload: { contentId } }).catch(() => {});
    revalidateContent(contentId);
    return { ok: true, contentId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to approve content." };
  }
}

export async function rejectContentAction(contentId: string, reason: string): Promise<ActionResult> {
  try {
    if (!reason || reason.trim().length < 3) {
      return { ok: false, error: "A reason is required so AURIX can learn from this rejection." };
    }
    const { user, content } = await requireContentOwnership(contentId);
    if (!canTransition(content.status, "NEEDS_EDIT")) {
      return { ok: false, error: `Cannot reject content in status ${content.status}.` };
    }
    await prisma.$transaction([
      prisma.content.update({ where: { id: contentId }, data: { status: "NEEDS_EDIT", rejectionReason: reason } }),
      prisma.approvalEvent.create({ data: { contentId, userId: user.id, action: "REJECT", reason } }),
    ]);
    await recordFeedbackMemory({ brandId: content.brandId, contentId, source: "REJECTION_FEEDBACK", reason });
    await recordAuditEvent({ category: "publishing", action: "content.rejected", organizationId: user.organizationId, actorId: user.id, metadata: { contentId, reason } });
    revalidateContent(contentId);
    revalidatePath("/brand");
    return { ok: true, contentId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to reject content." };
  }
}

export async function requestChangesAction(contentId: string, reason: string): Promise<ActionResult> {
  try {
    if (!reason || reason.trim().length < 3) {
      return { ok: false, error: "Describe what needs to change." };
    }
    const { user, content } = await requireContentOwnership(contentId);
    if (!canTransition(content.status, "NEEDS_EDIT")) {
      return { ok: false, error: `Cannot request changes on content in status ${content.status}.` };
    }
    await prisma.$transaction([
      prisma.content.update({ where: { id: contentId }, data: { status: "NEEDS_EDIT", rejectionReason: reason } }),
      prisma.approvalEvent.create({ data: { contentId, userId: user.id, action: "REQUEST_CHANGES", reason } }),
    ]);
    await recordFeedbackMemory({ brandId: content.brandId, contentId, source: "REJECTION_FEEDBACK", reason });
    await recordAuditEvent({ category: "publishing", action: "content.changes_requested", organizationId: user.organizationId, actorId: user.id, metadata: { contentId, reason } });
    revalidateContent(contentId);
    revalidatePath("/brand");
    return { ok: true, contentId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to request changes." };
  }
}

export interface ScheduleInput {
  scheduledFor: string; // ISO datetime-local value
}

export async function scheduleContentAction(contentId: string, input: ScheduleInput): Promise<ActionResult> {
  try {
    const { user, content } = await requireContentOwnership(contentId);
    if (!canTransition(content.status, "SCHEDULED")) {
      return { ok: false, error: `Cannot schedule content in status ${content.status}.` };
    }
    const scheduledFor = new Date(input.scheduledFor);
    if (Number.isNaN(scheduledFor.getTime())) {
      return { ok: false, error: "Invalid date/time." };
    }

    const integration = await prisma.integration.findUnique({
      where: { brandId_type: { brandId: content.brandId, type: "INSTAGRAM" } },
    });
    const provider = integration?.status === "CONNECTED" ? "instagram_graph" : "mock";

    await prisma.$transaction([
      prisma.content.update({ where: { id: contentId }, data: { status: "SCHEDULED" } }),
      prisma.calendarItem.upsert({
        where: { contentId },
        create: {
          brandId: content.brandId,
          contentId,
          title: content.title,
          scheduledFor,
          platform: content.platform,
          format: content.format,
        },
        update: { scheduledFor },
      }),
      prisma.publishingJob.create({
        data: {
          brandId: content.brandId,
          contentId,
          status: "QUEUED",
          provider,
          scheduledFor,
          idempotencyKey: `content:${contentId}:${randomUUID()}`,
        },
      }),
    ]);

    await recordAuditEvent({ category: "publishing", action: "content.scheduled", organizationId: user.organizationId, actorId: user.id, metadata: { contentId, scheduledFor, provider } });
    void emitN8nEvent({
      eventType: N8N_EVENTS.CONTENT_SCHEDULED,
      organizationId: user.organizationId,
      payload: { contentId, scheduledFor: scheduledFor.toISOString(), provider },
    }).catch(() => {});
    revalidateContent(contentId);
    return { ok: true, contentId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to schedule content." };
  }
}

export async function archiveContentAction(contentId: string): Promise<ActionResult> {
  try {
    const { user, content } = await requireContentOwnership(contentId);
    if (!canTransition(content.status, "ARCHIVED")) {
      return { ok: false, error: `Cannot archive content in status ${content.status}.` };
    }
    await prisma.content.update({ where: { id: contentId }, data: { status: "ARCHIVED" } });
    await recordAuditEvent({ category: "publishing", action: "content.archived", organizationId: user.organizationId, actorId: user.id, metadata: { contentId } });
    revalidateContent(contentId);
    return { ok: true, contentId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to archive content." };
  }
}

export interface ManualEditInput {
  title?: string;
  hook?: string;
  caption?: string;
  cta?: string;
  hashtags?: string; // newline/comma separated
}

export async function manualEditContentAction(contentId: string, input: ManualEditInput): Promise<ActionResult> {
  try {
    const { content } = await requireContentOwnership(contentId);
    const hashtags = input.hashtags
      ? input.hashtags.split(/\r?\n|,/).map((h) => h.trim()).filter(Boolean)
      : undefined;

    const updated = await prisma.content.update({
      where: { id: contentId },
      data: {
        title: input.title ?? undefined,
        hook: input.hook ?? undefined,
        caption: input.caption ?? undefined,
        cta: input.cta ?? undefined,
        hashtags,
        // A manual edit invalidates the AI's confidence on the content — send it back through review.
        status: content.status === "PENDING_APPROVAL" || content.status === "NEEDS_EDIT" ? "DRAFT" : content.status,
      },
    });

    await createNextVersion(
      contentId,
      { title: updated.title, hook: updated.hook, caption: updated.caption, cta: updated.cta, hashtags: updated.hashtags },
      "Manual edit",
      "human"
    );

    revalidateContent(contentId);
    return { ok: true, contentId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to save edits." };
  }
}
