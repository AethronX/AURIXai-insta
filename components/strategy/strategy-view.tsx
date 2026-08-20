import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface StrategyData {
  version: number;
  summary: string;
  goals: string[];
  weeklyThemes: string[];
  recommendedFormats: string[];
  recommendations: string[];
  contentPillars: Array<{ id: string; name: string; description: string; targetRatio: number | null }>;
}

export function StrategyView({ strategy }: { strategy: StrategyData }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Strategy v{strategy.version}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground">{strategy.summary}</p>

          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted">Goals</p>
            <ul className="list-inside list-disc space-y-0.5 text-sm">
              {strategy.goals.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted">Weekly themes</p>
            <div className="flex flex-wrap gap-1.5">
              {strategy.weeklyThemes.map((t, i) => (
                <Badge key={i} tone="brand">{t}</Badge>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted">Recommended formats</p>
            <div className="flex flex-wrap gap-1.5">
              {strategy.recommendedFormats.map((f, i) => (
                <Badge key={i} tone="neutral">{f}</Badge>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted">Recommendations</p>
            <ul className="list-inside list-disc space-y-0.5 text-sm">
              {strategy.recommendations.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content pillars</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {strategy.contentPillars.map((p) => (
            <div key={p.id} className="rounded-[var(--radius-sm)] border border-border p-3">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-semibold">{p.name}</p>
                {p.targetRatio != null && <Badge tone="neutral">{Math.round(p.targetRatio * 100)}%</Badge>}
              </div>
              <p className="text-xs text-muted">{p.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
