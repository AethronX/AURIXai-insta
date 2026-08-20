"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { AsyncActionButton } from "@/components/ui/async-action-button";
import { manualEditContentAction } from "@/lib/actions/content-actions";
import { regenerateCaptionAction } from "@/lib/actions/ai-actions";

export function ContentEditorForm({
  contentId,
  defaults,
}: {
  contentId: string;
  defaults: { title: string; hook: string; caption: string; cta: string; hashtags: string[] };
}) {
  const [title, setTitle] = useState(defaults.title);
  const [hook, setHook] = useState(defaults.hook);
  const [caption, setCaption] = useState(defaults.caption);
  const [cta, setCta] = useState(defaults.cta);
  const [hashtags, setHashtags] = useState(defaults.hashtags.join(", "));
  const [instruction, setInstruction] = useState("");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await manualEditContentAction(contentId, { title, hook, caption, cta, hashtags });
      if (result.ok) setSaved(true);
      else setError(result.error ?? "Failed to save.");
    });
  }

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-1">
        <CardTitle>Content</CardTitle>
        <CardDescription>Edit directly, or ask AI to rewrite the caption below.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="title">Internal title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="hook">Hook</Label>
          <Textarea id="hook" rows={2} value={hook} onChange={(e) => setHook(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="caption">Caption</Label>
          <Textarea id="caption" rows={6} value={caption} onChange={(e) => setCaption(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="cta">CTA</Label>
          <Input id="cta" value={cta} onChange={(e) => setCta(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="hashtags">Hashtags (comma separated)</Label>
          <Textarea id="hashtags" rows={2} value={hashtags} onChange={(e) => setHashtags(e.target.value)} />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex items-center gap-3">
          <Button type="button" disabled={isPending} onClick={save}>
            {isPending ? "Saving…" : "Save changes"}
          </Button>
          {saved && !error && <span className="text-sm text-success">Saved</span>}
        </div>

        <div className="rounded-[var(--radius-sm)] border border-border p-3">
          <Label htmlFor="instruction">Rewrite caption with AI</Label>
          <div className="flex gap-2">
            <Input
              id="instruction"
              placeholder="e.g. make it punchier, add more urgency"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
            />
            <AsyncActionButton
              variant="secondary"
              onRun={() => regenerateCaptionAction(contentId, instruction || undefined)}
              pendingLabel="Rewriting…"
            >
              Regenerate
            </AsyncActionButton>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
