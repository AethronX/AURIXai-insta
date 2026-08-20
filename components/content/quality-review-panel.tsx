"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AsyncActionButton } from "@/components/ui/async-action-button";
import { reviewContentAction } from "@/lib/actions/ai-actions";

const SCORE_LABELS: Record<string, string> = {
  hook: "Hook",
  clarity: "Clarity",
  value: "Value",
  brandFit: "Brand fit",
  audienceFit: "Audience fit",
  originality: "Originality",
  cta: "CTA",
  visualDirection: "Visual direction",
  accuracy: "Accuracy",
  platformFit: "Platform fit",
};

export interface QualityReviewData {
  id: string;
  overallScore: number;
  scores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  issues: string[];
  recommendations: string[];
  outcome: string;
  createdAt: string | Date;
}

export function QualityReviewPanel({ contentId, review }: { contentId: string; review: QualityReviewData | null }) {
  return (
    <Card>
      <CardHeader className="items-start">
        <div>
          <CardTitle>AI quality review</CardTitle>
          <CardDescription>Automated scoring — human approval is always still required to publish.</CardDescription>
        </div>
        <AsyncActionButton size="sm" variant="secondary" onRun={() => reviewContentAction(contentId)} pendingLabel="Reviewing…">
          {review ? "Re-run review" : "Run AI review"}
        </AsyncActionButton>
      </CardHeader>
      <CardContent>
        {!review ? (
          <p className="text-sm text-muted">Not reviewed yet.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-semibold">{review.overallScore}</span>
              <span className="text-sm text-muted">/ 100</span>
              <Badge tone={review.outcome === "APPROVED" ? "success" : "warning"}>{review.outcome === "APPROVED" ? "Cleared threshold" : "Needs work"}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
              {Object.entries(review.scores).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="text-muted">{SCORE_LABELS[key] ?? key}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
            {review.issues.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold text-danger">Issues</p>
                <ul className="list-inside list-disc space-y-0.5 text-sm text-foreground">
                  {review.issues.map((i, idx) => (
                    <li key={idx}>{i}</li>
                  ))}
                </ul>
              </div>
            )}
            {review.recommendations.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold text-muted">Recommendations</p>
                <ul className="list-inside list-disc space-y-0.5 text-sm text-foreground">
                  {review.recommendations.map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {review.strengths.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-success">Strengths</p>
                  <ul className="list-inside list-disc space-y-0.5 text-xs text-muted">
                    {review.strengths.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {review.weaknesses.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-warning">Weaknesses</p>
                  <ul className="list-inside list-disc space-y-0.5 text-xs text-muted">
                    {review.weaknesses.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
