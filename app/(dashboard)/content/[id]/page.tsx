import { notFound } from "next/navigation";
import Link from "next/link";
import { requireBrandOrRedirect } from "@/lib/brand/service";
import { getContentDetail } from "@/lib/content/service";
import { StatusBadge } from "@/components/content/status-badge";
import { QualityReviewPanel } from "@/components/content/quality-review-panel";
import { ContentEditorForm } from "@/components/content/content-editor-form";
import { CarouselSlides, type CarouselSlideData } from "@/components/content/carousel-slides";
import { CreativeAssetsPanel } from "@/components/content/creative-assets-panel";
import { ApprovalPanel } from "@/components/content/approval-panel";
import { VersionHistory } from "@/components/content/version-history";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function ContentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { brand } = await requireBrandOrRedirect();
  const content = await getContentDetail(id);

  if (!content || content.brandId !== brand.id) {
    notFound();
  }

  const body = content.body as { slides?: CarouselSlideData[]; visualDirection?: string; assumptions?: string[] };
  const latestReview = content.qualityReviews[0] ?? null;
  const briefs = content.assets.filter((a) => a.type === "DESIGN_BRIEF").map((a) => a.visualBrief as never);
  const images = content.assets.filter((a) => a.type === "IMAGE");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/content" className="text-sm text-muted hover:text-foreground">
          ← Content Studio
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">{content.title}</h1>
          <StatusBadge status={content.status} />
          <Badge tone="neutral">{content.format}</Badge>
          {content.contentPillar && <Badge tone="brand">{content.contentPillar.name}</Badge>}
        </div>
        {content.objective && <p className="mt-1 text-sm text-muted">{content.objective}</p>}
      </div>

      {body?.assumptions && body.assumptions.length > 0 && (
        <Card className="border-warning-soft bg-warning-soft">
          <CardContent className="pt-5">
            <p className="mb-1 text-xs font-semibold text-warning">AI assumptions — verify before publishing</p>
            <ul className="list-inside list-disc text-sm text-warning">
              {body.assumptions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <ContentEditorForm
        key={content.updatedAt.toISOString()}
        contentId={content.id}
        defaults={{
          title: content.title,
          hook: content.hook ?? "",
          caption: content.caption ?? "",
          cta: content.cta ?? "",
          hashtags: content.hashtags,
        }}
      />

      {content.format === "CAROUSEL" && body?.slides && <CarouselSlides slides={body.slides} />}

      <QualityReviewPanel
        contentId={content.id}
        review={
          latestReview
            ? {
                id: latestReview.id,
                overallScore: latestReview.overallScore,
                scores: latestReview.scores as Record<string, number>,
                strengths: latestReview.strengths,
                weaknesses: latestReview.weaknesses,
                issues: latestReview.issues,
                recommendations: latestReview.recommendations,
                outcome: latestReview.outcome,
                createdAt: latestReview.createdAt,
              }
            : null
        }
      />

      <CreativeAssetsPanel
        contentId={content.id}
        briefs={briefs}
        images={images.map((i) => ({ id: i.id, slideNumber: i.slideNumber, url: i.url, provider: i.provider }))}
      />

      <ApprovalPanel contentId={content.id} status={content.status} rejectionReason={content.rejectionReason} />

      <VersionHistory versions={content.versions} />
    </div>
  );
}
