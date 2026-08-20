"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { generateStrategyAction } from "@/lib/actions/ai-actions";

export function GenerateStrategyForm({ hasStrategy }: { hasStrategy: boolean }) {
  const [publishingFrequency, setPublishingFrequency] = useState("3-4 posts per week");
  const [businessObjectives, setBusinessObjectives] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-1">
        <CardTitle>{hasStrategy ? "Regenerate strategy" : "Generate your first strategy"}</CardTitle>
        <CardDescription>AURIX picks content pillars, themes, and formats specific to this brand — not a generic template.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="publishingFrequency">Publishing frequency</Label>
          <Input id="publishingFrequency" value={publishingFrequency} onChange={(e) => setPublishingFrequency(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="businessObjectives">Business objectives (optional)</Label>
          <Input
            id="businessObjectives"
            placeholder="e.g. Grow foot traffic to our new location"
            value={businessObjectives}
            onChange={(e) => setBusinessObjectives(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await generateStrategyAction({ publishingFrequency, businessObjectives: businessObjectives || undefined });
              if (!result.ok) setError(result.error ?? "Failed to generate strategy.");
            })
          }
        >
          {isPending ? "Generating…" : hasStrategy ? "Regenerate strategy" : "Generate strategy"}
        </Button>
      </CardContent>
    </Card>
  );
}
