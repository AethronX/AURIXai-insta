import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { runDuePublishingJobs } from "@/lib/publishing/runner";

describe("runDuePublishingJobs (against real Postgres, mock Instagram provider)", () => {
  let orgId: string;
  let brandId: string;

  beforeAll(async () => {
    const suffix = randomUUID().slice(0, 8);
    const org = await prisma.organization.create({ data: { name: `Test Org ${suffix}`, slug: `test-org-${suffix}` } });
    orgId = org.id;
    const brand = await prisma.brand.create({ data: { organizationId: orgId, name: "Test Brand" } });
    brandId = brand.id;
  });

  afterAll(async () => {
    await prisma.organization.delete({ where: { id: orgId } }).catch(() => {});
  });

  async function createDueJob(overrides?: { withImage?: boolean }) {
    const content = await prisma.content.create({
      data: {
        brandId,
        title: "Test post",
        format: "POST",
        platform: "INSTAGRAM",
        status: "SCHEDULED",
        caption: "A test caption",
        hashtags: ["#test"],
        body: {},
      },
    });

    if (overrides?.withImage ?? true) {
      await prisma.contentAsset.create({
        data: { contentId: content.id, type: "IMAGE", provider: "MOCK", url: "https://example.com/mock.png" },
      });
    }

    const job = await prisma.publishingJob.create({
      data: {
        brandId,
        contentId: content.id,
        status: "QUEUED",
        provider: "mock",
        scheduledFor: new Date(Date.now() - 1000),
        idempotencyKey: `test:${content.id}:${randomUUID()}`,
      },
    });

    return { content, job };
  }

  it("publishes a due job with an image via the mock Instagram provider", async () => {
    const { content, job } = await createDueJob();

    const result = await runDuePublishingJobs();

    expect(result.processed).toBeGreaterThanOrEqual(1);

    const updatedJob = await prisma.publishingJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(updatedJob.status).toBe("PUBLISHED");
    expect(updatedJob.externalPostId).toMatch(/^mock_/);

    const updatedContent = await prisma.content.findUniqueOrThrow({ where: { id: content.id } });
    expect(updatedContent.status).toBe("PUBLISHED");
  });

  it("fails a job with no generated images without leaving it stuck in PUBLISHING", async () => {
    const { job } = await createDueJob({ withImage: false });

    await runDuePublishingJobs();

    const updatedJob = await prisma.publishingJob.findUniqueOrThrow({ where: { id: job.id } });
    // maxAttempts defaults to 3, so a single run should leave it RETRYING, not stuck mid-flight.
    expect(["RETRYING", "FAILED"]).toContain(updatedJob.status);
    expect(updatedJob.errorMessage).toMatch(/No generated images/);
  });

  it("does not reprocess a job that is not yet due", async () => {
    const content = await prisma.content.create({
      data: { brandId, title: "Future post", format: "POST", platform: "INSTAGRAM", status: "SCHEDULED", body: {} },
    });
    const job = await prisma.publishingJob.create({
      data: {
        brandId,
        contentId: content.id,
        status: "QUEUED",
        provider: "mock",
        scheduledFor: new Date(Date.now() + 60 * 60 * 1000),
        idempotencyKey: `test:${content.id}:${randomUUID()}`,
      },
    });

    await runDuePublishingJobs();

    const untouched = await prisma.publishingJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(untouched.status).toBe("QUEUED");
  });
});
