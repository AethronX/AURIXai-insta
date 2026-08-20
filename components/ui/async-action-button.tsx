"use client";

import { useState, useTransition } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ActionLike {
  ok: boolean;
  error?: string;
  summary?: string;
  message?: string;
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        className={cn(className)}
        disabled={isPending || props.disabled}
        onClick={() => {
          setError(null);
          setSuccessMessage(null);
          startTransition(async () => {
            const result = await onRun();
            if (result.ok) {
              setSuccessMessage(result.summary ?? result.message ?? "Done");
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
      {successMessage && !error && <span className="max-w-xs text-xs text-success">{successMessage}</span>}
    </div>
  );
}
