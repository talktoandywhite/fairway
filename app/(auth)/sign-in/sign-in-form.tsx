"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { FormField, describedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  magicLinkSchema,
  signInSchema,
  type MagicLinkInput,
  type SignInInput,
} from "@/lib/schemas/auth";

import { magicLinkAction, signInAction } from "../actions";
import { FormAlert } from "../_components/form-alert";
import { useAuthForm } from "../_components/use-auth-form";

/**
 * Sign-in: password by default, with a one-time email link as an alternative.
 * Both routes are the same account; the toggle just picks the credential. The
 * `redirect` prop threads a same-origin return path through the password action
 * (the server re-narrows it, so a tampered value can't become an open redirect).
 */
export function SignInForm({ redirect }: { redirect?: string }) {
  const [mode, setMode] = useState<"password" | "magic">("password");

  const password = useAuthForm<SignInInput>({
    schema: signInSchema,
    defaultValues: { email: "", password: "" },
    action: signInAction,
    extraFields: redirect ? { redirect } : undefined,
  });

  const magic = useAuthForm<MagicLinkInput>({
    schema: magicLinkSchema,
    defaultValues: { email: "" },
    action: magicLinkAction,
  });

  if (mode === "magic") {
    const { form, onSubmit, formError, message, isSubmitting } = magic;
    const emailError = form.formState.errors.email?.message;
    return (
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
        {message ? <FormAlert tone="success">{message}</FormAlert> : null}
        <FormField id="magic-email" label="Email" error={emailError}>
          <Input
            id="magic-email"
            type="email"
            autoComplete="email"
            aria-invalid={!!emailError}
            aria-describedby={describedBy("magic-email", undefined, emailError)}
            {...form.register("email")}
          />
        </FormField>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Sending…" : "Email me a sign-in link"}
        </Button>
        <button
          type="button"
          onClick={() => setMode("password")}
          className="text-sm font-medium text-secondary-strong underline-offset-4 hover:underline"
        >
          Use a password instead
        </button>
      </form>
    );
  }

  const { form, onSubmit, formError, isSubmitting } = password;
  const emailError = form.formState.errors.email?.message;
  const passwordError = form.formState.errors.password?.message;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
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
      <FormField id="password" label="Password" error={passwordError}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!passwordError}
          aria-describedby={describedBy("password", undefined, passwordError)}
          {...form.register("password")}
        />
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
      <div className="flex flex-col gap-2 text-sm">
        <button
          type="button"
          onClick={() => setMode("magic")}
          className="self-start font-medium text-secondary-strong underline-offset-4 hover:underline"
        >
          Prefer a one-time link? Email me instead
        </button>
        <Link
          href="/forgot-password"
          className="self-start text-muted-foreground underline-offset-4 hover:underline"
        >
          Forgot your password?
        </Link>
      </div>
    </form>
  );
}
