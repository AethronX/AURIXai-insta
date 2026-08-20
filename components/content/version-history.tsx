import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface VersionEntry {
  id: string;
  versionNumber: number;
  changeSummary: string | null;
  createdBy: string | null;
  createdAt: Date;
}

export function VersionHistory({ versions }: { versions: VersionEntry[] }) {
  if (versions.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Version history</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {versions.map((v) => (
          <div key={v.id} className="flex items-center justify-between text-sm">
            <span>
              v{v.versionNumber} — {v.changeSummary ?? "Update"}
            </span>
            <div className="flex items-center gap-2 text-xs text-muted">
              <Badge tone={v.createdBy === "ai" ? "info" : "neutral"}>{v.createdBy === "ai" ? "AI" : "You"}</Badge>
              {new Date(v.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
