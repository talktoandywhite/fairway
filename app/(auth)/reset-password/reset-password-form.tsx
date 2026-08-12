"use client";

import { Button } from "@/components/ui/button";
import { FormField, describedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  updatePasswordSchema,
  type UpdatePasswordInput,
} from "@/lib/schemas/auth";

import { updatePasswordAction } from "../actions";
import { FormAlert } from "../_components/form-alert";
import { useAuthForm } from "../_components/use-auth-form";

/**
 * Set a new password. Reachable only from the recovery link, which /auth/callback
 * exchanges for a live session; without that session the action returns an
 * expired-link error rather than pretending to succeed. On success it redirects
 * into the app, so no success message is rendered here.
 */
export function ResetPasswordForm() {
  const { form, onSubmit, formError, isSubmitting } =
    useAuthForm<UpdatePasswordInput>({
      schema: updatePasswordSchema,
      defaultValues: { password: "", confirmPassword: "" },
      action: updatePasswordAction,
    });

  const errors = form.formState.errors;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
      <FormField
        id="password"
        label="New password"
        hint="At least 8 characters."
        error={errors.password?.message}
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          aria-describedby={describedBy(
            "password",
            "At least 8 characters.",
            errors.password?.message,
          )}
          {...form.register("password")}
        />
      </FormField>
      <FormField
        id="confirmPassword"
        label="Confirm new password"
        error={errors.confirmPassword?.message}
      >
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          aria-describedby={describedBy(
            "confirmPassword",
            undefined,
            errors.confirmPassword?.message,
          )}
          {...form.register("confirmPassword")}
        />
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
