"use client";

import { Button } from "@/components/ui/button";
import { FormField, describedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { resetRequestSchema, type ResetRequestInput } from "@/lib/schemas/auth";

import { requestPasswordResetAction } from "../actions";
import { FormAlert } from "../_components/form-alert";
import { useAuthForm } from "../_components/use-auth-form";

/**
 * Request a password-reset email. The success notice is intentionally the same
 * whether or not the email has an account, so this form can't be used to probe
 * which addresses are registered.
 */
export function ForgotPasswordForm() {
  const { form, onSubmit, formError, message, isSubmitting } =
    useAuthForm<ResetRequestInput>({
      schema: resetRequestSchema,
      defaultValues: { email: "" },
      action: requestPasswordResetAction,
    });

  const emailError = form.formState.errors.email?.message;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
      {message ? <FormAlert tone="success">{message}</FormAlert> : null}
      <FormField id="email" label="Email" error={emailError}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!emailError}
          aria-describedby={describedBy("email", undefined, emailError)}
          {...form.register("email")}
        />
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : "Email me a reset link"}
      </Button>
    </form>
  );
}
