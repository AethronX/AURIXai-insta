"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label, Select, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generatePostAction, generateCarouselAction } from "@/lib/actions/ai-actions";

export function NewContentForm({ pillars }: { pillars: Array<{ id: string; name: string }> }) {
  const [format, setFormat] = useState<"POST" | "CAROUSEL">("POST");
  const [objective, setObjective] = useState("");
  const [pillarId, setPillarId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    if (!objective.trim()) {
      setError("Describe what this content should accomplish.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result =
        format === "POST"
          ? await generatePostAction({ objective, contentPillarId: pillarId || undefined })
          : await generateCarouselAction({ objective, contentPillarId: pillarId || undefined });

      if (result.ok && result.contentId) {
        router.push(`/content/${result.contentId}`);
      } else {
        setError(result.error ?? "Generation failed.");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-1">
        <CardTitle>Generate new content</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="format">Format</Label>
          <Select id="format" value={format} onChange={(e) => setFormat(e.target.value as "POST" | "CAROUSEL")}>
            <option value="POST">Single post</option>
            <option value="CAROUSEL">Carousel</option>
          </Select>
        </div>
        {pillars.length > 0 && (
          <div>
            <Label htmlFor="pillar">Content pillar (optional)</Label>
            <Select id="pillar" value={pillarId} onChange={(e) => setPillarId(e.target.value)}>
              <option value="">Let AURIX choose</option>
              {pillars.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div>
          <Label htmlFor="objective">What should this content accomplish?</Label>
          <Textarea
            id="objective"
            rows={3}
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="e.g. Introduce our new cold brew kit and drive DMs for pre-orders"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="button" disabled={isPending} onClick={submit}>
          {isPending ? "Generating…" : "Generate with AI"}
        </Button>
      </CardContent>
    </Card>
  );
}
