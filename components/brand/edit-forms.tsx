"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  BusinessFields,
  AudienceFields,
  VoiceFields,
  VisualIdentityFields,
  ContentRulesFields,
  type BusinessDefaults,
  type AudienceDefaults,
  type VoiceDefaults,
  type VisualDefaults,
  type RulesDefaults,
} from "@/components/brand/fields";
import type { FormState } from "@/lib/actions/auth-actions";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

const INITIAL_STATE: FormState = {};

function SaveBar({ pending, state }: { pending: boolean; state: FormState }) {
  const hasSubmitted = state !== INITIAL_STATE;
  return (
    <div className="mt-5 flex items-center gap-3">
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
      {hasSubmitted && (state.error ? <span className="text-sm text-danger">{state.error}</span> : <span className="text-sm text-success">Saved</span>)}
    </div>
  );
}

export function BusinessEditForm({ action, defaults }: { action: Action; defaults: BusinessDefaults }) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  return (
    <form action={formAction}>
      <BusinessFields defaults={defaults} />
      <SaveBar pending={pending} state={state} />
    </form>
  );
}

export function AudienceEditForm({ action, defaults }: { action: Action; defaults: AudienceDefaults }) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  return (
    <form action={formAction}>
      <AudienceFields defaults={defaults} />
      <SaveBar pending={pending} state={state} />
    </form>
  );
}

export function VoiceEditForm({ action, defaults }: { action: Action; defaults: VoiceDefaults }) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  return (
    <form action={formAction}>
      <VoiceFields defaults={defaults} />
      <SaveBar pending={pending} state={state} />
    </form>
  );
}

export function VisualIdentityEditForm({ action, defaults }: { action: Action; defaults: VisualDefaults }) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  return (
    <form action={formAction}>
      <VisualIdentityFields defaults={defaults} />
      <SaveBar pending={pending} state={state} />
    </form>
  );
}

export function ContentRulesEditForm({ action, defaults }: { action: Action; defaults: RulesDefaults }) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  return (
    <form action={formAction}>
      <ContentRulesFields defaults={defaults} />
      <SaveBar pending={pending} state={state} />
    </form>
  );
}
