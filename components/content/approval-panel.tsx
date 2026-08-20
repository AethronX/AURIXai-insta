"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  approveContentAction,
  rejectContentAction,
  requestChangesAction,
  scheduleContentAction,
} from "@/lib/actions/content-actions";
import type { ContentStatus } from "@prisma/client";

function ReasonAction({
  label,
  actionLabel,
  variant,
  onSubmit,
}: {
  label: string;
  actionLabel: string;
  variant: "danger" | "outline";
  onSubmit: (reason: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button type="button" variant={variant} size="sm" onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  }

  return (
    <div className="w-full space-y-2 rounded-[var(--radius-sm)] border border-border p-3">
      <Label htmlFor={`reason-${label}`}>Why? (this trains AURIX&rsquo;s brand memory)</Label>
      <Textarea id={`reason-${label}`} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={variant}
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await onSubmit(reason);
              if (!result.ok) setError(result.error ?? "Failed");
              else setOpen(false);
            })
          }
        >
          {isPending ? "Submitting…" : actionLabel}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function ApprovalPanel({
  contentId,
  status,
  rejectionReason,
}: {
  contentId: string;
  status: ContentStatus;
  rejectionReason: string | null;
}) {
  const [scheduledFor, setScheduledFor] = useState("");
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval & scheduling</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {status === "NEEDS_EDIT" && rejectionReason && (
          <div className="rounded-[var(--radius-sm)] border border-warning-soft bg-warning-soft p-3 text-sm text-warning">
            <Badge tone="warning">Needs edit</Badge>
            <p className="mt-1">{rejectionReason}</p>
          </div>
        )}

        {status === "PENDING_APPROVAL" && (
          <div className="flex flex-wrap items-start gap-2">
            <div className="flex flex-col gap-1">
              <Button
                type="button"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    setApproveError(null);
                    const result = await approveContentAction(contentId);
                    if (!result.ok) setApproveError(result.error ?? "Failed to approve");
                  })
                }
              >
                Approve
              </Button>
              {approveError && <span className="text-xs text-danger">{approveError}</span>}
            </div>
            <ReasonAction label="Request changes" actionLabel="Send back" variant="outline" onSubmit={(reason) => requestChangesAction(contentId, reason)} />
            <ReasonAction label="Reject" actionLabel="Reject" variant="danger" onSubmit={(reason) => rejectContentAction(contentId, reason)} />
          </div>
        )}

        {status === "APPROVED" && (
          <div className="space-y-2">
            <Label htmlFor="scheduledFor">Schedule for</Label>
            <div className="flex gap-2">
              <Input
                id="scheduledFor"
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
              />
              <Button
                type="button"
                disabled={isPending || !scheduledFor}
                onClick={() =>
                  startTransition(async () => {
                    setScheduleError(null);
                    const result = await scheduleContentAction(contentId, { scheduledFor });
                    if (!result.ok) setScheduleError(result.error ?? "Failed to schedule");
                  })
                }
              >
                {isPending ? "Scheduling…" : "Schedule"}
              </Button>
            </div>
            {scheduleError && <p className="text-sm text-danger">{scheduleError}</p>}
          </div>
        )}

        {status === "SCHEDULED" && <p className="text-sm text-muted">Scheduled — a publishing job is queued.</p>}
        {status === "PUBLISHING" && <p className="text-sm text-info">Publishing now…</p>}
        {status === "PUBLISHED" && <p className="text-sm text-success">Published.</p>}
        {status === "FAILED" && <p className="text-sm text-danger">Publishing failed — see the job details below.</p>}
        {(status === "DRAFT" || status === "AI_REVIEW" || status === "IDEA") && (
          <p className="text-sm text-muted">Run AI review to move this into the approval queue.</p>
        )}
      </CardContent>
    </Card>
  );
}
