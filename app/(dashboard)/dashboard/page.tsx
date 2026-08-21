import Link from "next/link";
import { requireBrandOrRedirect } from "@/lib/brand/service";
import { getDashboardOverview } from "@/lib/dashboard/service";
import { isClaudeConfigured, isN8nConfigured } from "@/lib/env";
import { formatNumber, formatPercent, formatRelativeTime } from "@/lib/utils";
import { StatusBadge } from "@/components/content/status-badge";
import { InsightBanner } from "@/components/dashboard/insight-banner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ACTIVITY_LABEL: Record<string, string> = {
  "content.post.generated": "Generated a post",
  "content.carousel.generated": "Generated a carousel",
  "content.images.generated": "Generated images",
  "content.caption.regenerated": "Regenerated a caption",
  "content.creative_brief.generated": "Generated a creative brief",
  "content.reviewed": "AI review completed",
  "content.approved": "Approved for publishing",
  "content.rejected": "Rejected",
  "content.changes_requested": "Sent back for revision",
  "content.scheduled": "Scheduled",
  "content.archived": "Archived",
  "content.published": "Published to Instagram",
  "content.publish_failed": "Publish failed",
  "strategy.generated": "Generated a new strategy",
  "insight.generated": "Generated an AI insight",
  "insight.applied": "Applied an AI insight",
  "insight.dismissed": "Dismissed an AI insight",
  "analytics.synced": "Synced analytics",
  "brand.onboarded": "Brand onboarded",
  "integration.instagram.mock_connected": "Connected Instagram (mock)",
};

export default async function DashboardPage() {
  const { brand } = await requireBrandOrRedirect();
  const {
    statusCounts,
    reviewQueue,
    upcoming,
    analyticsSummary,
    latestInsight,
    activeStrategy,
    instagramIntegration,
    recentActivity,
    failedJobs,
    lastAnalyticsSyncAt,
  } = await getDashboardOverview(brand.id, brand.organizationId);

  const totalContent = Object.values(statusCounts).reduce((a, b) => a + (b ?? 0), 0);
  const published = statusCounts.PUBLISHED ?? 0;
  const scheduled = statusCounts.SCHEDULED ?? 0;

  const instagramConnected = instagramIntegration?.status === "CONNECTED" || instagramIntegration?.status === "MOCK";
  const claudeOn = isClaudeConfigured();
  const n8nOn = isN8nConfigured();

  const needsAttention: Array<{ tone: "danger" | "warning" | "neutral"; text: string; href: string }> = [];
  for (const job of failedJobs) {
    needsAttention.push({
      tone: "danger",
      text: `Publish failed: "${job.content.title}"${job.errorMessage ? ` — ${job.errorMessage}` : ""}`,
      href: `/content/${job.contentId}`,
    });
  }
  if (instagramIntegration?.status === "ERROR") {
    needsAttention.push({
      tone: "danger",
      text: `Instagram integration error${instagramIntegration.lastError ? `: ${instagramIntegration.lastError}` : ""}`,
      href: "/integrations",
    });
  } else if (!instagramIntegration || instagramIntegration.status === "NOT_CONNECTED") {
    needsAttention.push({ tone: "neutral", text: "Instagram isn't connected — publishing stays in mock mode.", href: "/integrations" });
  }
  if (reviewQueue.length > 0) {
    needsAttention.push({ tone: "warning", text: `${reviewQueue.length} item(s) waiting for your review`, href: "/review" });
  }
  if (!claudeOn) {
    needsAttention.push({ tone: "warning", text: "Claude API key isn't set — AI generation is disabled.", href: "/integrations" });
  }
  if (!n8nOn) {
    needsAttention.push({ tone: "neutral", text: "n8n isn't configured — automation workflows are inactive.", href: "/integrations" });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatusPill label="Claude" ok={claudeOn} onLabel="Connected" offLabel="Not configured" />
        <StatusPill label="n8n" ok={n8nOn} onLabel="Configured" offLabel="Not configured" />
        <StatusPill label="Instagram" ok={instagramConnected} onLabel={instagramIntegration?.status === "MOCK" ? "Mock" : "Connected"} offLabel={instagramIntegration?.status === "ERROR" ? "Error" : "Not connected"} />
        <StatusPill
          label="Analytics"
          ok={Boolean(lastAnalyticsSyncAt)}
          onLabel={lastAnalyticsSyncAt ? `Synced ${formatRelativeTime(lastAnalyticsSyncAt)}` : "Synced"}
          offLabel="Not synced yet"
        />
      </div>

      {latestInsight && (
        <InsightBanner insight={{ id: latestInsight.id, summary: latestInsight.summary, confidence: latestInsight.confidence }} />
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Published" value={published} sub={`of ${totalContent} total`} />
        <StatCard label="Scheduled" value={scheduled} sub="upcoming posts" />
        <StatCard label="Reach" value={formatNumber(analyticsSummary.totalReach)} sub={`${analyticsSummary.publishedCount} published w/ metrics`} />
        <StatCard label="Avg. engagement" value={formatPercent(analyticsSummary.avgEngagementRate)} sub="across published content" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="items-start">
            <div>
              <CardTitle>Review queue</CardTitle>
              <CardDescription>Content waiting on your review</CardDescription>
            </div>
            <Link href="/review" className="text-xs font-medium text-brand hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {reviewQueue.length === 0 ? (
              <p className="text-sm text-muted">Nothing waiting on you right now.</p>
            ) : (
              reviewQueue.slice(0, 5).map((c) => (
                <Link
                  key={c.id}
                  href={`/content/${c.id}`}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-border px-3 py-2 text-sm hover:bg-surface-hover"
                >
                  <span className="truncate">{c.title}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {c.qualityReviews[0] && <Badge tone="brand">{c.qualityReviews[0].overallScore}/100</Badge>}
                    <StatusBadge status={c.status} />
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="items-start">
            <div>
              <CardTitle>Needs attention</CardTitle>
              <CardDescription>Things worth a look</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {needsAttention.length === 0 ? (
              <p className="text-sm text-muted">All clear — nothing needs your attention.</p>
            ) : (
              needsAttention.slice(0, 6).map((item, i) => (
                <Link
                  key={i}
                  href={item.href}
                  className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border px-3 py-2 text-sm hover:bg-surface-hover"
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      item.tone === "danger" ? "bg-danger" : item.tone === "warning" ? "bg-warning" : "bg-muted-foreground"
                    }`}
                  />
                  <span className="truncate">{item.text}</span>
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
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-border px-3 py-2 text-sm hover:bg-surface-hover"
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

        <Card>
          <CardHeader className="items-start">
            <div>
              <CardTitle>Top performing</CardTitle>
              <CardDescription>By engagement rate</CardDescription>
            </div>
            <Link href="/analytics" className="text-xs font-medium text-brand hover:underline">
              View analytics
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {analyticsSummary.topPerforming.length === 0 ? (
              <p className="text-sm text-muted">No published content with metrics yet.</p>
            ) : (
              analyticsSummary.topPerforming.slice(0, 5).map((c) => (
                <Link
                  key={c.contentId}
                  href={`/content/${c.contentId}`}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-border px-3 py-2 text-sm hover:bg-surface-hover"
                >
                  <span className="truncate">{c.title}</span>
                  <span className="shrink-0 text-xs font-medium text-success">{formatPercent(c.engagementRate)}</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

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
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted">Nothing has happened yet — generate content to get started.</p>
          ) : (
            recentActivity.map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-3 border-b border-border-light py-2 text-sm last:border-0 last:pb-0">
                <span className="text-foreground">{ACTIVITY_LABEL[event.action] ?? event.action}</span>
                <span className="shrink-0 text-xs text-muted">{formatRelativeTime(event.createdAt)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusPill({
  label,
  ok,
  onLabel,
  offLabel,
}: {
  label: string;
  ok: boolean;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-3.5 py-2.5">
      <span className={`h-2 w-2 shrink-0 rounded-full ${ok ? "bg-success" : "bg-muted-foreground"}`} />
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className="truncate text-xs text-foreground">{ok ? onLabel : offLabel}</p>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs text-muted">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
        <p className="mt-0.5 text-xs text-muted">{sub}</p>
      </CardContent>
    </Card>
  );
}
