"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { FormField, describedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  HOMEWORK_STATUSES,
  HOMEWORK_STATUS_LABELS,
  HOMEWORK_UNANSWERED_LABEL,
  lessonSchema,
  type LessonFormValues,
} from "@/lib/schemas/lesson";

import {
  createLessonAction,
  updateLessonAction,
} from "@/app/(app)/lessons/actions";
import { FormAlert } from "@/app/(auth)/_components/form-alert";

/**
 * The lesson form — create and edit share it; the only differences are the
 * initial values and which action it calls. It validates on the client with the
 * SAME `lessonSchema` the server re-parses (CLAUDE.md: shared schema), but the
 * server is the security boundary and RLS the backstop.
 *
 * The shape follows how a lesson is actually remembered: what the coach said
 * (the swing key), what they gave you to do (the drill and the target), and what
 * moved (what changed). Only the date is required, so an athlete can log "I saw
 * Coach Diaz on Tuesday" in ten seconds and add the detail later — which is the
 * version that actually gets logged.
 *
 * The homework block is grouped together because it is the part that outlives the
 * lesson: it is what the dashboard surfaces and what the athlete comes back to
 * update. Its status defaults to unanswered, never to "no" — the app does not
 * record a verdict the athlete never gave.
 *
 * The cost is typed in dollars and stored as integer cents — the schema does that
 * conversion, so this form only ever holds the dollars string the athlete typed.
 * The FormData is built from `getValues()` (the raw store) rather than the
 * submit-handler argument, so the schema's dollars→cents rename can never drop
 * the field regardless of resolver plumbing.
 */

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function createDefaults(): LessonFormValues {
  return {
    occurred_on: todayIso(),
    coach_name: null,
    swing_key: null,
    drill_assigned: null,
    homework_target: null,
    homework_done: "",
    cost: "",
    what_changed: null,
  };
}

export function LessonForm({
  mode,
  lessonId,
  initialValues,
}: {
  mode: "create" | "edit";
  lessonId?: string;
  /** Prefill for edit mode; ignored in create mode. */
  initialValues?: LessonFormValues;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [formError, setFormError] = React.useState<string | undefined>();

  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema) as Resolver<LessonFormValues>,
    defaultValues: initialValues ?? createDefaults(),
    mode: "onBlur",
  });

  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(() => {
    setFormError(undefined);
    const values = form.getValues();
    const fd = new FormData();

    // Always present — the one required field.
    fd.set("occurred_on", values.occurred_on);

    // Optional — omit empties so the server stores null (not ""). Clearing a
    // field in edit mode therefore clears it in the database, which is the
    // behaviour the edit form promises.
    const setIf = (key: string, v: string | null) => {
      if (v !== null && v !== undefined && v.trim() !== "") fd.set(key, v);
    };
    setIf("coach_name", values.coach_name);
    setIf("swing_key", values.swing_key);
    setIf("drill_assigned", values.drill_assigned);
    setIf("homework_target", values.homework_target);
    setIf("homework_done", values.homework_done);
    setIf("cost", values.cost);
    setIf("what_changed", values.what_changed);

    if (mode === "edit" && lessonId) fd.set("id", lessonId);

    startTransition(async () => {
      const result =
        mode === "edit"
          ? await updateLessonAction(fd)
          : await createLessonAction(fd);
      // A successful action redirects (throws) and never returns a state object.
      if (!result) return;
      if (result.fieldErrors) {
        for (const [name, messages] of Object.entries(result.fieldErrors)) {
          const first = messages?.[0];
          // Server paths match the form's field names, so an error lands on the
          // input that caused it.
          if (first) form.setError(name as never, { message: first });
        }
      }
      if (result.error) setFormError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}

      {/* --- When and who --------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          id="occurred_on"
          label="Date"
          error={errors.occurred_on?.message}
        >
          <Input
            id="occurred_on"
            type="date"
            aria-invalid={!!errors.occurred_on}
            aria-describedby={describedBy(
              "occurred_on",
              undefined,
              errors.occurred_on?.message,
            )}
            {...form.register("occurred_on")}
          />
        </FormField>

        <FormField
          id="coach_name"
          label="Coach"
          error={errors.coach_name?.message}
        >
          <Input
            id="coach_name"
            placeholder="e.g. Coach Diaz"
            autoComplete="off"
            aria-invalid={!!errors.coach_name}
            aria-describedby={describedBy(
              "coach_name",
              undefined,
              errors.coach_name?.message,
            )}
            {...form.register("coach_name")}
          />
        </FormField>
      </div>

      {/* --- What the coach said -------------------------------------------- */}
      {/* The visible group label IS the `legend`, not a heading beside an
          sr-only one: that pairing announces the section twice to a screen
          reader, and an `h2` here would also come out in the display serif at
          14px (globals.css scopes serif to h1/h2), which is not what a form
          group label wants. Matches the practice form. */}
      <fieldset className="flex flex-col gap-4 border-t border-border pt-5">
        <legend className="text-sm font-semibold text-foreground">
          The lesson
        </legend>

        <FormField
          id="swing_key"
          label="Swing key"
          hint="The one thought to take to the range."
          error={errors.swing_key?.message}
        >
          <Input
            id="swing_key"
            placeholder="e.g. Putter face square at impact"
            aria-invalid={!!errors.swing_key}
            aria-describedby={describedBy(
              "swing_key",
              "The one thought to take to the range.",
              errors.swing_key?.message,
            )}
            {...form.register("swing_key")}
          />
        </FormField>

        <FormField
          id="what_changed"
          label="What changed"
          hint="Worth writing while it's fresh — this is what you'll read before the next lesson."
          error={errors.what_changed?.message}
        >
          <Textarea
            id="what_changed"
            placeholder="e.g. Backswing got shorter and more connected. Contact improved right away."
            aria-invalid={!!errors.what_changed}
            aria-describedby={describedBy(
              "what_changed",
              "Worth writing while it's fresh — this is what you'll read before the next lesson.",
              errors.what_changed?.message,
            )}
            {...form.register("what_changed")}
          />
        </FormField>
      </fieldset>

      {/* --- What you were given to do --------------------------------------- */}
      <fieldset className="flex flex-col gap-4 border-t border-border pt-5">
        <legend className="text-sm font-semibold text-foreground">
          Homework
        </legend>
        <p className="-mt-2 text-sm text-muted-foreground">
          Set a target and it shows up on your dashboard until you say how it
          went.
        </p>

        <FormField
          id="drill_assigned"
          label="Drill assigned"
          error={errors.drill_assigned?.message}
        >
          <Input
            id="drill_assigned"
            placeholder="e.g. Gate drill from 4 ft, 20 makes"
            aria-invalid={!!errors.drill_assigned}
            aria-describedby={describedBy(
              "drill_assigned",
              undefined,
              errors.drill_assigned?.message,
            )}
            {...form.register("drill_assigned")}
          />
        </FormField>

        <FormField
          id="homework_target"
          label="Target"
          hint="What finishing it looks like."
          error={errors.homework_target?.message}
        >
          <Input
            id="homework_target"
            placeholder="e.g. Every practice for 3 weeks"
            aria-invalid={!!errors.homework_target}
            aria-describedby={describedBy(
              "homework_target",
              "What finishing it looks like.",
              errors.homework_target?.message,
            )}
            {...form.register("homework_target")}
          />
        </FormField>

        <FormField
          id="homework_done"
          label="Did you get to it?"
          error={errors.homework_done?.message}
        >
          <Select
            id="homework_done"
            aria-invalid={!!errors.homework_done}
            aria-describedby={describedBy(
              "homework_done",
              undefined,
              errors.homework_done?.message,
            )}
            {...form.register("homework_done")}
          >
            {/* Unanswered is the default and a real state — the app never records
                a verdict the athlete didn't give. */}
            <option value="">{HOMEWORK_UNANSWERED_LABEL}</option>
            {HOMEWORK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {HOMEWORK_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </FormField>
      </fieldset>

      {/* --- What it cost ---------------------------------------------------- */}
      {/* One field, so the group label stays sr-only — a visible "Cost" heading
          directly above a "Cost" label is noise. */}
      <fieldset className="flex flex-col gap-4 border-t border-border pt-5">
        <legend className="sr-only">Cost</legend>
        <FormField
          id="cost"
          label="Cost"
          hint="Leave blank if you'd rather not track it."
          error={errors.cost?.message}
        >
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-sm text-muted-foreground">
              $
            </span>
            <Input
              id="cost"
              inputMode="decimal"
              placeholder="90"
              className="data-value max-w-40 tabular-nums"
              aria-invalid={!!errors.cost}
              aria-describedby={describedBy(
                "cost",
                "Leave blank if you'd rather not track it.",
                errors.cost?.message,
              )}
              {...form.register("cost")}
            />
          </div>
        </FormField>
      </fieldset>

      {/* --- Actions --------------------------------------------------------- */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Saving…"
            : mode === "edit"
              ? "Save changes"
              : "Log lesson"}
        </Button>
      </div>
    </form>
  );
}
