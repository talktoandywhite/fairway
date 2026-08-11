"use client";

import { Button } from "@/components/ui/button";
import { FormField, describedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  isUnderCoppaAge,
  signUpSchema,
  type SignUpInput,
} from "@/lib/schemas/auth";

import { signUpAction } from "../actions";
import { FormAlert } from "../_components/form-alert";
import { useAuthForm } from "../_components/use-auth-form";

/**
 * Sign-up. Collects a date of birth, and reveals the guardian-email field the
 * moment that date shows the athlete is under 13 — the account will be frozen
 * until that guardian consents, so we ask for the address in the same breath.
 * The reveal is a UX affordance; the real requirement is enforced by the schema
 * (server-side) and the RLS consent gate.
 */
export function SignUpForm({ redirect }: { redirect?: string }) {
  const { form, onSubmit, formError, message, isSubmitting } =
    useAuthForm<SignUpInput>({
      schema: signUpSchema,
      defaultValues: {
        displayName: "",
        email: "",
        password: "",
        dateOfBirth: "",
        guardianEmail: "",
      },
      action: signUpAction,
      extraFields: redirect ? { redirect } : undefined,
      resetOnMessage: false,
    });

  const errors = form.formState.errors;
  const dob = form.watch("dateOfBirth");
  const needsGuardian = !!dob && isUnderCoppaAge(dob);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
      {message ? <FormAlert tone="success">{message}</FormAlert> : null}

      <FormField
        id="displayName"
        label="Name"
        error={errors.displayName?.message}
      >
        <Input
          id="displayName"
          autoComplete="name"
          aria-invalid={!!errors.displayName}
          aria-describedby={describedBy(
            "displayName",
            undefined,
            errors.displayName?.message,
          )}
          {...form.register("displayName")}
        />
      </FormField>

      <FormField id="email" label="Email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={describedBy(
            "email",
            undefined,
            errors.email?.message,
          )}
          {...form.register("email")}
        />
      </FormField>

      <FormField
        id="password"
        label="Password"
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
        id="dateOfBirth"
        label="Date of birth"
        hint="We use this to keep younger players' accounts safe."
        error={errors.dateOfBirth?.message}
      >
        <Input
          id="dateOfBirth"
          type="date"
          max={today}
          autoComplete="bday"
          aria-invalid={!!errors.dateOfBirth}
          aria-describedby={describedBy(
            "dateOfBirth",
            "We use this to keep younger players' accounts safe.",
            errors.dateOfBirth?.message,
          )}
          {...form.register("dateOfBirth")}
        />
      </FormField>

      {needsGuardian ? (
        <FormField
          id="guardianEmail"
          label="Parent or guardian email"
          hint="Because you're under 13, a parent or guardian has to say it's OK before your account turns on. We'll email them a link."
          error={errors.guardianEmail?.message}
        >
          <Input
            id="guardianEmail"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.guardianEmail}
            aria-describedby={describedBy(
              "guardianEmail",
              "Because you're under 13, a parent or guardian has to say it's OK before your account turns on. We'll email them a link.",
              errors.guardianEmail?.message,
            )}
            {...form.register("guardianEmail")}
          />
        </FormField>
      ) : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating your account…" : "Create account"}
      </Button>
    </form>
  );
}
