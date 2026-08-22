"use client";

import { useActionState, useState } from "react";
import { OnboardingForm } from "@/components/brand/onboarding-form";
import { completeOnboardingAction, extractBrandFromPromptAction } from "@/lib/actions/brand-actions";
import type { BrandExtractionOutput } from "@/lib/validation/ai-schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Mode = "choose" | "prompt" | "questions";

function ModeCard({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[var(--radius-md)] border border-border bg-surface p-5 text-left transition-colors hover:border-brand hover:bg-surface-hover"
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </button>
  );
}

/** Free-text description in, a prefilled step form out — the user still reviews and edits every
 * field on the same form/validation path as manual entry before "Finish setup" saves anything. */
function PromptStep({
  onBack,
  onExtracted,
}: {
  onBack: () => void;
  onExtracted: (data: BrandExtractionOutput) => void;
}) {
  const [state, formAction, pending] = useActionState(extractBrandFromPromptAction, {});

  // Adjusted during render, not in an effect — React's recommended pattern for reacting to a
  // value that changed (here, a freshly-generated result) rather than syncing local state.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.data) onExtracted(state.data);
  }

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-1">
        <CardTitle>Describe your business</CardTitle>
        <CardDescription>
          One paragraph is enough — AURIX drafts the full brand profile. You still review and can
          edit every field before anything is saved.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <Textarea
            name="description"
            rows={7}
            required
            minLength={20}
            placeholder="e.g. AURIX is a website, e-commerce, and landing page design studio serving businesses in Oman and the Gulf. We build sites that earn visitor trust and convert them into customers..."
          />
          {state.error && (
            <p className="mt-3 text-sm text-danger">
              <Badge tone="danger">Error</Badge> {state.error}
            </p>
          )}
          <div className="mt-4 flex items-center justify-between">
            <Button type="button" variant="outline" onClick={onBack} disabled={pending}>
              Back
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Generating…" : "Generate brand profile"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function OnboardingFlow() {
  const [mode, setMode] = useState<Mode>("choose");
  const [defaults, setDefaults] = useState<BrandExtractionOutput | undefined>(undefined);

  if (mode === "questions") {
    return <OnboardingForm action={completeOnboardingAction} defaults={defaults} />;
  }

  if (mode === "prompt") {
    return (
      <PromptStep
        onBack={() => setMode("choose")}
        onExtracted={(data) => {
          setDefaults(data);
          setMode("questions");
        }}
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <ModeCard
        title="Quick AI prompt"
        description="Describe your business in a paragraph — AURIX drafts the full profile for you to review and edit."
        onClick={() => setMode("prompt")}
      />
      <ModeCard
        title="Guided questions"
        description="Answer a short set of structured questions, one step at a time."
        onClick={() => setMode("questions")}
      />
    </div>
  );
}
