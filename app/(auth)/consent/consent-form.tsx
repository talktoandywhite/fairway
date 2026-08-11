"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { verifyGuardianConsentAction, type AuthActionState } from "../actions";
import { FormAlert } from "../_components/form-alert";

/**
 * The guardian's one action: confirm consent for the athlete named in the
 * email. Consent is an explicit click, never a bare page load — a link
 * pre-fetch or scanner GET must not be able to activate a child's account, so
 * the state change lives behind this POST.
 */
export function ConsentForm({ token }: { token: string }) {
  const [state, setState] = useState<AuthActionState | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const confirmed = state?.message != null;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const formData = new FormData();
    formData.set("token", token);
    const result = await verifyGuardianConsentAction(formData);
    setState(result);
    setSubmitting(false);
  }

  if (confirmed) {
    return <FormAlert tone="success">{state?.message}</FormAlert>;
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {state?.error ? <FormAlert tone="error">{state.error}</FormAlert> : null}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Confirming…" : "I consent — activate this account"}
      </Button>
      <p className="text-sm text-muted-foreground">
        By confirming, you agree to let this athlete use Fairway to track their
        golf. You can ask us to close the account at any time.
      </p>
    </form>
  );
}
