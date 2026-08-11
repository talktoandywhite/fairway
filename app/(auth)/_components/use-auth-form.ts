"use client";

import { useState } from "react";
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Path,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodType } from "zod";

import type { AuthActionState } from "../actions";

/**
 * The client half of every auth form. React Hook Form + a Zod resolver give
 * instant, per-field validation (CLAUDE.md's Forms stack); the SAME schema is
 * re-run on the server inside the action, so the client is a UX layer and never
 * the security boundary.
 *
 * On submit it hands the values to the server action as FormData. If the action
 * navigates (redirect), the awaited call resolves to nothing and we simply stop.
 * If it returns state, we surface it: `fieldErrors` map back onto the matching
 * RHF fields, `error` becomes a form-level alert, and `message` becomes a
 * success notice (and the form resets, since those flows stay on the page).
 */
export function useAuthForm<T extends FieldValues>({
  schema,
  defaultValues,
  action,
  extraFields,
  resetOnMessage = true,
}: {
  schema: ZodType<T>;
  defaultValues: DefaultValues<T>;
  action: (formData: FormData) => Promise<AuthActionState>;
  /** Non-schema values to include in the submission (e.g. a `redirect` target). */
  extraFields?: Record<string, string>;
  resetOnMessage?: boolean;
}): {
  form: UseFormReturn<T>;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  formError?: string;
  message?: string;
  isSubmitting: boolean;
} {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onBlur",
  });
  const [formError, setFormError] = useState<string | undefined>();
  const [message, setMessage] = useState<string | undefined>();

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(undefined);
    setMessage(undefined);

    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined && value !== null && value !== "") {
        formData.set(key, String(value));
      }
    }
    for (const [key, value] of Object.entries(extraFields ?? {})) {
      formData.set(key, value);
    }

    const result = await action(formData);
    // A redirecting action resolves without a state object.
    if (!result) return;

    if (result.fieldErrors) {
      for (const [name, messages] of Object.entries(result.fieldErrors)) {
        const first = messages?.[0];
        if (first) form.setError(name as Path<T>, { message: first });
      }
    }
    if (result.error) setFormError(result.error);
    if (result.message) {
      setMessage(result.message);
      if (resetOnMessage) form.reset();
    }
  });

  return {
    form,
    onSubmit,
    formError,
    message,
    isSubmitting: form.formState.isSubmitting,
  };
}
