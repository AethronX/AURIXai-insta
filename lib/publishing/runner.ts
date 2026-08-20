import "server-only";
import { prisma } from "@/lib/db";
import { getInstagramProviderForBrand } from "@/lib/social/registry";
import { emitN8nEvent } from "@/lib/n8n/client";
import { N8N_EVENTS } from "@/lib/n8n/events";
import { recordAuditEvent } from "@/lib/observability/audit";
import { logger } from "@/lib/observability/logger";
import type { Content, ContentAsset, PublishingJob } from "@prisma/client";

const BACKOFF_MINUTES = [2, 10, 30]; // attempt 1, 2, 3 retry delays

function nextAttemptDelayMs(attempts: number): number {
  const minutes = BACKOFF_MINUTES[Math.min(attempts - 1, BACKOFF_MINUTES.length - 1)];
  return minutes * 60 * 1000;
}

type JobWithContent = PublishingJob & { content: Content & { assets: ContentAsset[] } };

async function publishOneJob(job: JobWithContent): Promise<"PUBLISHED" | "FAILED" | "RETRYING"> {
  const { content } = job;

  await prisma.$transaction([
    prisma.publishingJob.update({ where: { id: job.id }, data: { status: "PUBLISHING", lastAttemptAt: new Date() } }),
    prisma.content.update({ where: { id: content.id }, data: { status: "PUBLISHING" } }),
  ]);
  void emitN8nEvent({
    eventType: N8N_EVENTS.CONTENT_PUBLISH_REQUESTED,
    organizationId: undefined,
    payload: { contentId: content.id, jobId: job.id },
  }).catch(() => {});

  try {
    const imageUrls = content.assets
      .filter((a) => a.type === "IMAGE" && a.url)
      .sort((a, b) => (a.slideNumber ?? 0) - (b.slideNumber ?? 0))
      .map((a) => a.url!);

    if (imageUrls.length === 0) {
      throw new Error("No generated images found for this content — generate creative + images before publishing.");
    }

    const { provider, isMock } = await getInstagramProviderForBrand(job.brandId);
    const result = await provider.publish({
      contentId: content.id,
      format: content.format,
      caption: [content.caption, "", (content.hashtags ?? []).join(" ")].filter(Boolean).join("\n"),
      imageUrls,
    });

    await prisma.$transaction([
      prisma.publishingJob.update({
        where: { id: job.id },
        data: { status: "PUBLISHED", externalPostId: result.externalPostId, attempts: { increment: 1 } },
      }),
      prisma.content.update({ where: { id: content.id }, data: { status: "PUBLISHED" } }),
    ]);

    await recordAuditEvent({
      category: "publishing",
      action: "content.published",
      metadata: { contentId: content.id, jobId: job.id, provider: provider.name, mock: isMock, externalPostId: result.externalPostId },
    });
    void emitN8nEvent({
      eventType: N8N_EVENTS.CONTENT_PUBLISHED,
      payload: { contentId: content.id, jobId: job.id, externalPostId: result.externalPostId, mock: isMock },
    }).catch(() => {});

    return "PUBLISHED";
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown publishing error";
    const attempts = job.attempts + 1;
    logger.error({ err, jobId: job.id, attempts }, "publishing job failed");

    if (attempts >= job.maxAttempts) {
      await prisma.$transaction([
        prisma.publishingJob.update({ where: { id: job.id }, data: { status: "FAILED", attempts, errorMessage: message } }),
        prisma.content.update({ where: { id: content.id }, data: { status: "FAILED" } }),
      ]);
      await recordAuditEvent({ category: "publishing", action: "content.publish_failed", metadata: { contentId: content.id, jobId: job.id, message } });
      void emitN8nEvent({ eventType: N8N_EVENTS.CONTENT_PUBLISH_FAILED, payload: { contentId: content.id, jobId: job.id, message } }).catch(() => {});
      return "FAILED";
    }

    await prisma.publishingJob.update({
      where: { id: job.id },
      data: {
        status: "RETRYING",
        attempts,
        errorMessage: message,
        nextAttemptAt: new Date(Date.now() + nextAttemptDelayMs(attempts)),
      },
    });
    return "RETRYING";
  }
}

export interface RunDuePublishingJobsResult {
  processed: number;
  published: number;
  failed: number;
  retrying: number;
}

/** Finds every due QUEUED/RETRYING publishing job and executes it. Idempotent per job — a job
 * already PUBLISHING/PUBLISHED/FAILED is never picked up twice by this query. */
export async function runDuePublishingJobs(limit = 20): Promise<RunDuePublishingJobsResult> {
  const now = new Date();
  const jobs = await prisma.publishingJob.findMany({
    where: {
      OR: [
        { status: "QUEUED", scheduledFor: { lte: now } },
        { status: "RETRYING", nextAttemptAt: { lte: now } },
      ],
    },
    take: limit,
    orderBy: { scheduledFor: "asc" },
    include: { content: { include: { assets: true } } },
  });

  const result: RunDuePublishingJobsResult = { processed: jobs.length, published: 0, failed: 0, retrying: 0 };
  for (const job of jobs) {
    const outcome = await publishOneJob(job);
    if (outcome === "PUBLISHED") result.published++;
    else if (outcome === "FAILED") result.failed++;
    else result.retrying++;
  }
  return result;
}
