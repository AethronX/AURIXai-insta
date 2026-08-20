import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withRouteErrorHandling, apiSuccess } from "@/lib/api/response";
import { verifyWebhookAuth } from "@/lib/security/webhook";
import type { ContentStatus } from "@prisma/client";

const VALID_STATUSES = new Set([
  "IDEA", "DRAFT", "AI_REVIEW", "NEEDS_EDIT", "PENDING_APPROVAL",
  "APPROVED", "SCHEDULED", "PUBLISHING", "PUBLISHED", "FAILED", "ARCHIVED",
]);

/**
 * Read-only content listing for n8n workflows (e.g. Workflow 3's analytics sync needs the list
 * of published posts and their external Instagram post IDs). Same bearer auth as the webhook
 * endpoint — see docs/N8N.md.
 */
export const GET = withRouteErrorHandling(async (request: Request) => {
  if (!verifyWebhookAuth(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const brandId = url.searchParams.get("brandId");
  const status = url.searchParams.get("status");

  if (status && !VALID_STATUSES.has(status)) {
    return NextResponse.json({ ok: false, error: `Invalid status: ${status}` }, { status: 400 });
  }

  const content = await prisma.content.findMany({
    where: {
      ...(brandId ? { brandId } : {}),
      ...(status ? { status: status as ContentStatus } : {}),
    },
    select: {
      id: true,
      brandId: true,
      title: true,
      format: true,
      status: true,
      updatedAt: true,
      publishingJobs: { select: { externalPostId: true, status: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
    take: 100,
    orderBy: { updatedAt: "desc" },
  });

  return apiSuccess(
    content.map((c) => ({
      id: c.id,
      brandId: c.brandId,
      title: c.title,
      format: c.format,
      status: c.status,
      updatedAt: c.updatedAt,
      externalPostId: c.publishingJobs[0]?.externalPostId ?? null,
    }))
  );
});
