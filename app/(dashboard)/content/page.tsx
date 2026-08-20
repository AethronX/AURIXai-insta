import Link from "next/link";
import { requireBrandOrRedirect } from "@/lib/brand/service";
import { listContent } from "@/lib/content/service";
import { prisma } from "@/lib/db";
import { NewContentForm } from "@/components/content/new-content-form";
import { StatusBadge } from "@/components/content/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ContentPage() {
  const { brand } = await requireBrandOrRedirect();
  const [content, pillars] = await Promise.all([
    listContent(brand.id),
    prisma.contentPillar.findMany({ where: { brandId: brand.id }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Content Studio</h1>
        <p className="mt-1 text-sm text-muted">Generate, review, and manage every piece of content for {brand.name}.</p>
      </div>

      <NewContentForm pillars={pillars.map((p) => ({ id: p.id, name: p.name }))} />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted">All content ({content.length})</h2>
        {content.length === 0 ? (
          <Card>
            <CardContent className="pt-5 text-sm text-muted">
              Nothing yet — generate your first post or carousel above.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {content.map((c) => {
              const review = c.qualityReviews[0];
              return (
                <Link key={c.id} href={`/content/${c.id}`}>
                  <Card className="transition-colors hover:bg-surface-hover">
                    <CardContent className="flex items-center justify-between gap-4 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{c.title}</p>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {c.format} · {c.contentPillar?.name ?? "No pillar"} · Updated{" "}
                          {new Date(c.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {review && <Badge tone={review.overallScore >= 85 ? "success" : "warning"}>{review.overallScore}/100</Badge>}
                        <StatusBadge status={c.status} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
