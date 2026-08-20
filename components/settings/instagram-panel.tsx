"use client";

import { useTransition, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  connectMockInstagramAction,
  disconnectInstagramAction,
  runPublishingNowAction,
  getInstagramOAuthUrl,
} from "@/lib/actions/integration-actions";

export function InstagramPanel({
  status,
  accountName,
  graphConfigured,
}: {
  status: "NOT_CONNECTED" | "CONNECTED" | "ERROR" | "MOCK";
  accountName: string | null;
  graphConfigured: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader className="items-start">
        <div>
          <CardTitle>Instagram</CardTitle>
          <CardDescription>Required to publish live. Without it, scheduled content publishes in mock mode.</CardDescription>
        </div>
        <Badge tone={status === "CONNECTED" ? "success" : status === "MOCK" ? "warning" : status === "ERROR" ? "danger" : "neutral"}>
          {status === "CONNECTED" ? "Connected" : status === "MOCK" ? "Mock connection" : status === "ERROR" ? "Error" : "Not connected"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {accountName && <p className="text-sm text-muted">Account: {accountName}</p>}

        <div className="flex flex-wrap items-center gap-2">
          {status !== "CONNECTED" && (
            <Button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const result = await getInstagramOAuthUrl();
                  if ("url" in result) window.location.href = result.url;
                  else setError(result.error);
                })
              }
            >
              Connect with Meta {!graphConfigured && "(requires META_APP_ID/SECRET)"}
            </Button>
          )}
          {status === "NOT_CONNECTED" && (
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  setMessage(null);
                  const result = await connectMockInstagramAction();
                  if (!result.ok) setError(result.error ?? "Failed");
                  else setMessage("Mock Instagram connection enabled for testing.");
                })
              }
            >
              Use mock connection for testing
            </Button>
          )}
          {(status === "CONNECTED" || status === "MOCK") && (
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => startTransition(async () => { await disconnectInstagramAction(); })}
            >
              Disconnect
            </Button>
          )}
        </div>

        <div className="border-t border-border pt-3">
          <p className="mb-2 text-xs text-muted">
            Publishing normally runs on a schedule via n8n (see docs/N8N.md). Trigger it manually here for testing:
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await runPublishingNowAction();
                if (!result.ok) setError(result.error ?? "Failed");
                else setMessage(result.summary ?? "Done.");
              })
            }
          >
            Run scheduled publishing now
          </Button>
        </div>

        {message && <p className="text-sm text-success">{message}</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
      </CardContent>
    </Card>
  );
}
