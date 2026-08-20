import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const SOURCE_LABEL: Record<string, string> = {
  APPROVAL_FEEDBACK: "From approval",
  REJECTION_FEEDBACK: "From rejection",
  MANUAL: "Manual note",
  PERFORMANCE_INSIGHT: "From analytics",
};

export function MemoryList({
  entries,
}: {
  entries: Array<{ id: string; key: string; insight: string; confidence: number; source: string; createdAt: Date }>;
}) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="pt-5 text-sm text-muted">
          No learned preferences yet. As you approve, reject, or request changes on content, AURIX
          builds this list automatically — it&rsquo;s how the AI gets better at matching your brand
          over time.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((e) => (
        <Card key={e.id}>
          <CardHeader className="items-start">
            <div>
              <CardTitle>{e.insight}</CardTitle>
              <CardDescription className="mt-1">
                {SOURCE_LABEL[e.source] ?? e.source} · {new Date(e.createdAt).toLocaleDateString()}
              </CardDescription>
            </div>
            <Badge tone={e.confidence >= 0.65 ? "success" : "warning"}>
              {Math.round(e.confidence * 100)}% confidence
            </Badge>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
