import Link from "next/link";
import { requireBrandOrRedirect } from "@/lib/brand/service";
import { listApprovalQueue, listUpcoming, countByStatus } from "@/lib/content/service";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CONTENT_STATUS_LABEL } from "@/lib/content/status";
import type { ContentStatus } from "@prisma/client";

export default async function DashboardPage() {
  const { brand } = await requireBrandOrRedirect();

  const [approvalQueue, upcoming, statusCounts, latestInsight, activeStrategy] = await Promise.all([
    listApprovalQueue(brand.id),
    listUpcoming(brand.id),
    countByStatus(brand.id),
    prisma.aIInsight.findFirst({ where: { brandId: brand.id }, orderBy: { createdAt: "desc" } }),
    prisma.strategy.findFirst({ where: { brandId: brand.id, isActive: true } }),
  ]);

  const totalContent = Object.values(statusCounts).reduce((a, b) => a + (b ?? 0), 0);
  const published = statusCounts.PUBLISHED ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Overview</h1>
        <p className="mt-1 text-sm text-muted">{brand.name}&rsquo;s content operations at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted">Total content</p>
            <p className="mt-1 text-2xl font-semibold">{totalContent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted">Pending approval</p>
            <p className="mt-1 text-2xl font-semibold">{statusCounts.PENDING_APPROVAL ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted">Scheduled</p>
            <p className="mt-1 text-2xl font-semibold">{statusCounts.SCHEDULED ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted">Published</p>
            <p className="mt-1 text-2xl font-semibold">{published}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="items-start">
            <div>
              <CardTitle>Approval queue</CardTitle>
              <CardDescription>Content waiting on your review</CardDescription>
            </div>
            <Link href="/content" className="text-xs font-medium text-brand hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {approvalQueue.length === 0 ? (
              <p className="text-sm text-muted">Nothing waiting on you right now.</p>
            ) : (
              approvalQueue.map((c) => (
                <Link
                  key={c.id}
                  href={`/content/${c.id}`}
                  className="flex items-center justify-between rounded-[var(--radius-sm)] border border-border px-3 py-2 text-sm hover:bg-surface-hover"
                >
                  <span className="truncate">{c.title}</span>
                  {c.qualityReviews[0] && <Badge tone="brand">{c.qualityReviews[0].overallScore}/100</Badge>}
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="items-start">
            <div>
              <CardTitle>Upcoming</CardTitle>
              <CardDescription>Scheduled content</CardDescription>
            </div>
            <Link href="/calendar" className="text-xs font-medium text-brand hover:underline">
              Open calendar
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted">Nothing scheduled yet.</p>
            ) : (
              upcoming.map((item) => (
                <Link
                  key={item.id}
                  href={item.content ? `/content/${item.content.id}` : "/calendar"}
                  className="flex items-center justify-between rounded-[var(--radius-sm)] border border-border px-3 py-2 text-sm hover:bg-surface-hover"
                >
                  <span className="truncate">{item.title}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {new Date(item.scheduledFor).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="items-start">
            <div>
              <CardTitle>AI strategy</CardTitle>
              <CardDescription>{activeStrategy ? `Version ${activeStrategy.version}` : "No strategy yet"}</CardDescription>
            </div>
            <Link href="/strategy" className="text-xs font-medium text-brand hover:underline">
              {activeStrategy ? "View strategy" : "Generate one"}
            </Link>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted">{activeStrategy?.summary ?? "Generate a strategy to guide what AURIX creates."}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="items-start">
            <div>
              <CardTitle>Latest AI insight</CardTitle>
              <CardDescription>{latestInsight ? new Date(latestInsight.createdAt).toLocaleDateString() : "Needs published content + analytics"}</CardDescription>
            </div>
            <Link href="/analytics" className="text-xs font-medium text-brand hover:underline">
              View analytics
            </Link>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted">{latestInsight?.summary ?? "No insights yet — publish content and sync analytics to unlock recommendations."}</p>
          </CardContent>
        </Card>
      </div>

      {totalContent > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pipeline breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(Object.entries(statusCounts) as Array<[ContentStatus, number]>).map(([status, count]) => (
              <Badge key={status} tone="neutral">
                {CONTENT_STATUS_LABEL[status]}: {count}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
