"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BusinessFields, AudienceFields, VoiceFields, VisualIdentityFields, ContentRulesFields } from "@/components/brand/fields";
import { cn } from "@/lib/utils";
import type { FormState } from "@/lib/actions/auth-actions";

const STEPS = [
  { key: "business", title: "The business", description: "The essentials — what this brand is and does." },
  { key: "audience", title: "The audience", description: "Who the content needs to speak to." },
  { key: "voice", title: "Brand voice", description: "How the brand sounds." },
  { key: "visual", title: "Visual identity", description: "Logo, colors, fonts, and image style." },
  { key: "rules", title: "Content rules", description: "Guardrails the AI must always respect." },
] as const;

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function OnboardingForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [step, setStep] = useState(0);

  const isLast = step === STEPS.length - 1;

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                i === step
                  ? "bg-brand text-brand-foreground"
                  : i < step
                  ? "bg-success-soft text-success"
                  : "bg-surface-hover text-muted"
              )}
            >
              {i + 1}
            </button>
            {i < STEPS.length - 1 && <div className="h-px w-6 bg-border" />}
          </div>
        ))}
      </div>

      {/*
        Only the final step renders a type="submit" button (see below), so there is never an
        implicit submit target while earlier steps are showing — no extra submit-guarding needed.
      */}
      <form action={formAction}>
        {STEPS.map((s, i) => (
          <div key={s.key} className={i === step ? "block" : "hidden"}>
            <Card>
              <CardHeader className="flex-col items-start gap-1">
                <CardTitle>{s.title}</CardTitle>
                <CardDescription>{s.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {s.key === "business" && <BusinessFields />}
                {s.key === "audience" && <AudienceFields />}
                {s.key === "voice" && <VoiceFields />}
                {s.key === "visual" && <VisualIdentityFields />}
                {s.key === "rules" && <ContentRulesFields />}
              </CardContent>
            </Card>
          </div>
        ))}

        {state.error && (
          <p className="mt-3 text-sm text-danger">
            <Badge tone="danger">Error</Badge> {state.error}
          </p>
        )}

        <div className="mt-5 flex items-center justify-between">
          <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
            Back
          </Button>
          {!isLast ? (
            <Button key="continue" type="button" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
              Continue
            </Button>
          ) : (
            <Button key="submit" type="submit" disabled={pending}>
              {pending ? "Setting up your brand…" : "Finish setup"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
