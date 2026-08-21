"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AsyncActionButton } from "@/components/ui/async-action-button";
import { applyInsightAction, dismissInsightAction } from "@/lib/actions/analytics-actions";

export function InsightBanner({
  insight,
}: {
  insight: { id: string; summary: string; confidence: number };
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-[var(--radius-md)] border border-border bg-brand-soft px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <Badge tone="brand">AI insight</Badge>
          <Badge tone={insight.confidence >= 0.6 ? "success" : "warning"}>
            {Math.round(insight.confidence * 100)}% confidence
          </Badge>
        </div>
        <p className="text-sm text-foreground">{insight.summary}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <AsyncActionButton size="sm" variant="secondary" onRun={() => applyInsightAction(insight.id)} pendingLabel="Applying…">
          Apply
        </AsyncActionButton>
        <AsyncActionButton size="sm" variant="ghost" onRun={() => dismissInsightAction(insight.id)} pendingLabel="Dismissing…">
          Dismiss
        </AsyncActionButton>
        <Link href="/analytics" className="text-xs font-medium text-brand hover:underline">
          Details
        </Link>
      </div>
    </div>
  );
}
