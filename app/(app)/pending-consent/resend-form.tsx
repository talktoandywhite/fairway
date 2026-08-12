"use client";

import { Button } from "@/components/ui/button";
import { FormField, describedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  guardianEmailSchema,
  type GuardianEmailInput,
} from "@/lib/schemas/auth";

import { resendGuardianConsentAction } from "@/app/(auth)/actions";
import { FormAlert } from "@/app/(auth)/_components/form-alert";
import { useAuthForm } from "@/app/(auth)/_components/use-auth-form";

/**
 * Resend the guardian consent email — or send it to a corrected address if the
 * first one had a typo. Each submit mints a fresh token, so an old link simply
 * stops being the newest; any unexpired token still works.
 */
export function ResendConsentForm({ defaultEmail }: { defaultEmail: string }) {
  const { form, onSubmit, formError, message, isSubmitting } =
    useAuthForm<GuardianEmailInput>({
      schema: guardianEmailSchema,
      defaultValues: { guardianEmail: defaultEmail },
      action: resendGuardianConsentAction,
      resetOnMessage: false,
    });

  const error = form.formState.errors.guardianEmail?.message;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
      {message ? <FormAlert tone="success">{message}</FormAlert> : null}
      <FormField
        id="guardianEmail"
        label="Parent or guardian email"
        error={error}
      >
        <Input
          id="guardianEmail"
          type="email"
          autoComplete="email"
          aria-invalid={!!error}
          aria-describedby={describedBy("guardianEmail", undefined, error)}
          {...form.register("guardianEmail")}
        />
      </FormField>
      <Button type="submit" variant="secondary" disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : "Resend consent email"}
      </Button>
    </form>
  );
}
