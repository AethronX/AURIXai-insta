import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ContentPerformance } from "@/lib/analytics/service";

export function Leaderboard({ title, items, tone }: { title: string; items: ContentPerformance[]; tone: "success" | "warning" }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted">Not enough published content yet.</p>
        ) : (
          items.map((item) => (
            <Link
              key={item.contentId}
              href={`/content/${item.contentId}`}
              className="flex items-center justify-between rounded-[var(--radius-sm)] border border-border px-3 py-2 text-sm hover:bg-surface-hover"
            >
              <span className="truncate">{item.title}</span>
              <Badge tone={tone}>{item.engagementRate}% engagement</Badge>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
