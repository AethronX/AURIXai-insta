import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface CarouselSlideData {
  number: number;
  headline: string;
  body: string;
  purpose: string;
  visualDirection: string;
  cta?: string;
}

export function CarouselSlides({ slides }: { slides: CarouselSlideData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Slides ({slides.length})</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {slides.map((slide) => (
          <div key={slide.number} className="rounded-[var(--radius-sm)] border border-border p-3">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-soft text-[10px] font-bold text-brand">
                {slide.number}
              </span>
              <Badge tone="neutral">{slide.purpose}</Badge>
            </div>
            <p className="text-sm font-semibold">{slide.headline}</p>
            <p className="mt-1 text-sm text-muted">{slide.body}</p>
            <p className="mt-2 text-xs italic text-muted-foreground">Visual: {slide.visualDirection}</p>
            {slide.cta && <p className="mt-1 text-xs font-medium text-brand">CTA: {slide.cta}</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
