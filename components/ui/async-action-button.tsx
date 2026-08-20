"use client";

import { useState, useTransition } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ActionLike {
  ok: boolean;
  error?: string;
}

export function AsyncActionButton({
  onRun,
  pendingLabel,
  children,
  onSuccess,
  className,
  ...props
}: Omit<ButtonProps, "onClick"> & {
  onRun: () => Promise<ActionLike>;
  pendingLabel?: string;
  onSuccess?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        className={cn(className)}
        disabled={isPending || props.disabled}
        onClick={() => {
          setError(null);
          setSucceeded(false);
          startTransition(async () => {
            const result = await onRun();
            if (result.ok) {
              setSucceeded(true);
              onSuccess?.();
            } else {
              setError(result.error ?? "Something went wrong.");
            }
          });
        }}
        {...props}
      >
        {isPending ? pendingLabel ?? "Working…" : children}
      </Button>
      {error && <span className="max-w-xs text-xs text-danger">{error}</span>}
      {succeeded && !error && <span className="text-xs text-success">Done</span>}
    </div>
  );
}
