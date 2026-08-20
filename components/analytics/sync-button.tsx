"use client";

import { AsyncActionButton } from "@/components/ui/async-action-button";
import { syncAnalyticsAction } from "@/lib/actions/analytics-actions";

export function SyncAnalyticsButton() {
  return (
    <AsyncActionButton variant="secondary" onRun={() => syncAnalyticsAction()} pendingLabel="Syncing…">
      Sync analytics now
    </AsyncActionButton>
  );
}
