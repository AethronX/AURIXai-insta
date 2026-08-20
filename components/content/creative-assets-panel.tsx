"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AsyncActionButton } from "@/components/ui/async-action-button";
import { generateCreativeBriefAction, generateImagesAction } from "@/lib/actions/ai-actions";

export interface DesignBrief {
  slideNumber: number | null;
  layoutRecommendation: string;
  visualHierarchy: string;
  typography: string;
  imageryDirection: string;
  composition: string;
  ctaPlacement: string;
  brandingPlacement: string;
  aspectRatio: string;
  safeAreaNotes: string;
}

export interface ImageAsset {
  id: string;
  slideNumber: number | null;
  url: string | null;
  provider: string;
}

export function CreativeAssetsPanel({
  contentId,
  briefs,
  images,
}: {
  contentId: string;
  briefs: DesignBrief[];
  images: ImageAsset[];
}) {
  return (
    <Card>
      <CardHeader className="items-start">
        <div>
          <CardTitle>Visual creative direction</CardTitle>
          <CardDescription>Precise briefs a designer or image generator can execute without guessing.</CardDescription>
        </div>
        <div className="flex gap-2">
          <AsyncActionButton size="sm" variant="secondary" onRun={() => generateCreativeBriefAction(contentId)} pendingLabel="Directing…">
            {briefs.length ? "Regenerate briefs" : "Generate creative brief"}
          </AsyncActionButton>
          <AsyncActionButton size="sm" variant="secondary" onRun={() => generateImagesAction(contentId)} pendingLabel="Rendering…" disabled={briefs.length === 0}>
            Generate images
          </AsyncActionButton>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {briefs.length === 0 ? (
          <p className="text-sm text-muted">No visual brief yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {briefs.map((b, idx) => {
              const image = images.find((i) => i.slideNumber === b.slideNumber);
              return (
                <div key={idx} className="rounded-[var(--radius-sm)] border border-border p-3">
                  <p className="mb-2 text-xs font-semibold text-muted">
                    {b.slideNumber ? `Slide ${b.slideNumber}` : "Cover image"} · {b.aspectRatio}
                  </p>
                  {image?.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image.url} alt="" className="mb-2 aspect-square w-full rounded border border-border object-cover" />
                  )}
                  <dl className="space-y-1 text-xs">
                    <div><dt className="inline font-medium">Layout: </dt><dd className="inline text-muted">{b.layoutRecommendation}</dd></div>
                    <div><dt className="inline font-medium">Imagery: </dt><dd className="inline text-muted">{b.imageryDirection}</dd></div>
                    <div><dt className="inline font-medium">Typography: </dt><dd className="inline text-muted">{b.typography}</dd></div>
                    <div><dt className="inline font-medium">CTA placement: </dt><dd className="inline text-muted">{b.ctaPlacement}</dd></div>
                    <div><dt className="inline font-medium">Safe area: </dt><dd className="inline text-muted">{b.safeAreaNotes}</dd></div>
                  </dl>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
