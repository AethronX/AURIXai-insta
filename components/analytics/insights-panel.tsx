"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AsyncActionButton } from "@/components/ui/async-action-button";
import { generateInsightsAction } from "@/lib/actions/analytics-actions";

export interface InsightData {
  id: string;
  summary: string;
  winningPatterns: string[];
  losingPatterns: string[];
  recommendations: string[];
  experiments: string[];
  confidence: number;
  createdAt: Date;
}

export function InsightsPanel({ insights }: { insights: InsightData[] }) {
  return (
    <Card>
      <CardHeader className="items-start">
        <div>
          <CardTitle>AI insights</CardTitle>
          <CardDescription>Generated from published content performance — not applied automatically.</CardDescription>
        </div>
        <AsyncActionButton size="sm" onRun={() => generateInsightsAction()} pendingLabel="Analyzing…">
          Generate insights
        </AsyncActionButton>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.length === 0 ? (
          <p className="text-sm text-muted">No insights yet — publish content, sync analytics, then generate insights.</p>
        ) : (
          insights.map((insight) => (
            <div key={insight.id} className="rounded-[var(--radius-sm)] border border-border p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{insight.summary}</p>
                <Badge tone={insight.confidence >= 0.6 ? "success" : "warning"}>
                  {Math.round(insight.confidence * 100)}% confidence
                </Badge>
              </div>
              <div className="grid gap-3 text-xs sm:grid-cols-2">
                {insight.winningPatterns.length > 0 && (
                  <div>
                    <p className="mb-1 font-semibold text-success">Winning patterns</p>
                    <ul className="list-inside list-disc text-muted">
                      {insight.winningPatterns.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {insight.losingPatterns.length > 0 && (
                  <div>
                    <p className="mb-1 font-semibold text-danger">Losing patterns</p>
                    <ul className="list-inside list-disc text-muted">
                      {insight.losingPatterns.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {insight.recommendations.length > 0 && (
                  <div>
                    <p className="mb-1 font-semibold text-brand">Recommendations</p>
                    <ul className="list-inside list-disc text-muted">
                      {insight.recommendations.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {insight.experiments.length > 0 && (
                  <div>
                    <p className="mb-1 font-semibold text-info">Try next</p>
                    <ul className="list-inside list-disc text-muted">
                      {insight.experiments.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
