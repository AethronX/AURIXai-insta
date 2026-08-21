import Link from "next/link";
import { requireBrandOrRedirect } from "@/lib/brand/service";
import { listReviewQueue } from "@/lib/content/service";
import { StatusBadge } from "@/components/content/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ReviewPage() {
  const { brand } = await requireBrandOrRedirect();
  const queue = await listReviewQueue(brand.id);
  const pendingCount = queue.filter((c) => c.status === "PENDING_APPROVAL").length;
  const needsEditCount = queue.filter((c) => c.status === "NEEDS_EDIT").length;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold">{queue.length} in queue</h1>
        <span className="text-sm text-muted">
          {pendingCount} awaiting approval · {needsEditCount} sent back for revision · human gate
        </span>
      </div>

      {queue.length === 0 ? (
        <Card>
          <CardContent className="pt-5 text-sm text-muted">
            Nothing needs your attention right now. Content shows up here once AI review clears it
            for approval, or after a rejection sends it back for revision.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {queue.map((c) => {
            const review = c.qualityReviews[0];
            return (
              <Link key={c.id} href={`/content/${c.id}`}>
                <Card className="transition-colors hover:bg-surface-hover">
                  <CardContent className="flex items-center gap-4 py-3.5">
                    <div className="h-9 w-9 shrink-0 rounded-md bg-[repeating-linear-gradient(135deg,#eceaf6_0_5px,#f6f5fb_5px_10px)]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {c.format.toLowerCase()} · {c.contentPillar?.name ?? "no pillar"} · updated{" "}
                        {new Date(c.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {review && (
                      <Badge tone={review.overallScore >= 85 ? "success" : "warning"}>{review.overallScore}/100</Badge>
                    )}
                    <StatusBadge status={c.status} />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
