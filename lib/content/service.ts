import "server-only";
import { prisma } from "@/lib/db";
import type { ContentStatus } from "@prisma/client";

export async function listContent(brandId: string, filters?: { status?: ContentStatus }) {
  return prisma.content.findMany({
    where: { brandId, ...(filters?.status ? { status: filters.status } : {}) },
    include: { contentPillar: true, qualityReviews: { orderBy: { createdAt: "desc" }, take: 1 }, calendarItem: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getContentDetail(id: string) {
  return prisma.content.findUnique({
    where: { id },
    include: {
      brand: { include: { visualIdentity: true } },
      contentPillar: true,
      versions: { orderBy: { versionNumber: "desc" } },
      assets: { orderBy: { slideNumber: "asc" } },
      qualityReviews: { orderBy: { createdAt: "desc" } },
      approvalEvents: { orderBy: { createdAt: "desc" }, include: { user: true } },
      calendarItem: true,
      publishingJobs: { orderBy: { createdAt: "desc" } },
      analyticsMetrics: { orderBy: { capturedAt: "desc" } },
    },
  });
}

export async function countByStatus(brandId: string) {
  const rows = await prisma.content.groupBy({ by: ["status"], where: { brandId }, _count: true });
  const counts: Partial<Record<ContentStatus, number>> = {};
  for (const row of rows) counts[row.status] = row._count;
  return counts;
}

export async function listApprovalQueue(brandId: string) {
  return prisma.content.findMany({
    where: { brandId, status: "PENDING_APPROVAL" },
    include: { qualityReviews: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { updatedAt: "asc" },
    take: 10,
  });
}

/** Everything that needs a human's attention right now: AI-cleared items awaiting approval,
 * and items an AI review or a prior human rejection sent back for revision. */
export async function listReviewQueue(brandId: string) {
  return prisma.content.findMany({
    where: { brandId, status: { in: ["PENDING_APPROVAL", "NEEDS_EDIT"] } },
    include: {
      qualityReviews: { orderBy: { createdAt: "desc" }, take: 1 },
      contentPillar: true,
    },
    orderBy: { updatedAt: "asc" },
  });
}

export async function listUpcoming(brandId: string) {
  return prisma.calendarItem.findMany({
    where: { brandId, scheduledFor: { gte: new Date() } },
    include: { content: true },
    orderBy: { scheduledFor: "asc" },
    take: 8,
  });
}
