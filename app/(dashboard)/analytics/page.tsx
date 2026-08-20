import { requireBrandOrRedirect } from "@/lib/brand/service";
import { getAnalyticsSummary, getInsights } from "@/lib/analytics/service";
import { SyncAnalyticsButton } from "@/components/analytics/sync-button";
import { ReachChart } from "@/components/analytics/reach-chart";
import { Leaderboard } from "@/components/analytics/leaderboard";
import { InsightsPanel } from "@/components/analytics/insights-panel";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

export default async function AnalyticsPage() {
  const { brand } = await requireBrandOrRedirect();
  const [summary, insights] = await Promise.all([getAnalyticsSummary(brand.id), getInsights(brand.id)]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Analytics</h1>
          <p className="mt-1 text-sm text-muted">Performance for {brand.name}&rsquo;s published content.</p>
        </div>
        <SyncAnalyticsButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted">Published posts</p>
            <p className="mt-1 text-2xl font-semibold">{summary.publishedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted">Total reach</p>
            <p className="mt-1 text-2xl font-semibold">{formatNumber(summary.totalReach)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted">Total engagements</p>
            <p className="mt-1 text-2xl font-semibold">{formatNumber(summary.totalEngagements)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted">Avg. engagement rate</p>
            <p className="mt-1 text-2xl font-semibold">{summary.avgEngagementRate}%</p>
          </CardContent>
        </Card>
      </div>

      <ReachChart data={summary.timeSeries} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Leaderboard title="Top performing" items={summary.topPerforming} tone="success" />
        <Leaderboard title="Needs attention" items={summary.lowPerforming} tone="warning" />
      </div>

      <InsightsPanel
        insights={insights.map((i) => ({
          id: i.id,
          summary: i.summary,
          winningPatterns: i.winningPatterns as string[],
          losingPatterns: i.losingPatterns as string[],
          recommendations: i.recommendations as string[],
          experiments: i.experiments as string[],
          confidence: i.confidence,
          createdAt: i.createdAt,
        }))}
      />
    </div>
  );
}
