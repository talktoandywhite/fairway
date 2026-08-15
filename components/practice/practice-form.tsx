"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormField, describedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  MINUTE_PRESETS,
  SESSION_TYPE_HINTS,
  SESSION_TYPE_LABELS,
  practiceSchema,
  type PracticeFormValues,
} from "@/lib/schemas/practice";
import { SESSION_TYPES } from "@/lib/stats";
import type { SessionType } from "@/lib/stats";

import {
  createPracticeAction,
  updatePracticeAction,
} from "@/app/(app)/practice/actions";
import { FormAlert } from "@/app/(auth)/_components/form-alert";

/**
 * The practice quick-add — create and edit share it; the only differences are the
 * initial values and which action it calls. Held to the same 60-second standard
 * as the round form (CLAUDE.md design principle #2), and a practice session has
 * an even lower excuse threshold than a round: if logging it takes longer than
 * walking to the car, it does not get logged.
 *
 * Shape of the screen, top to bottom:
 *   - Date (defaults to today), a seven-way type grid, and minutes. Three taps
 *     and a session is logged.
 *   - An "Add detail" disclosure holding focus, drill, result, and notes — the
 *     fields that make the log worth re-reading, for the sessions worth writing
 *     up. Its open/closed state is remembered per user in localStorage (a UI
 *     preference, not athlete data, so it never touches the database).
 *
 * It validates on the client with the SAME `practiceSchema` the server re-parses;
 * the server is the security boundary and RLS the backstop.
 */

const DISCLOSURE_KEY = "fairway.practice.detailOpen";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function createDefaults(): PracticeFormValues {
  return {
    occurred_on: todayIso(),
    session_type: "short_game",
    minutes: "",
    focus: null,
    drill: null,
    result: null,
    notes: null,
  };
}

export function PracticeForm({
  mode,
  sessionId,
  initialValues,
}: {
  mode: "create" | "edit";
  sessionId?: string;
  /** Prefill for edit mode; ignored in create mode. */
  initialValues?: PracticeFormValues;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [formError, setFormError] = React.useState<string | undefined>();

  const form = useForm<PracticeFormValues>({
    resolver: zodResolver(practiceSchema) as Resolver<PracticeFormValues>,
    defaultValues: initialValues ?? createDefaults(),
    mode: "onBlur",
  });

  const errors = form.formState.errors;

  const [detailOpen, setDetailOpen] = React.useState(false);
  React.useEffect(() => {
    try {
      if (window.localStorage.getItem(DISCLOSURE_KEY) === "open") {
        setDetailOpen(true);
      }
    } catch {
      // A blocked localStorage is not an error worth surfacing; stay closed.
    }
  }, []);
  const toggleDetail = () => {
    setDetailOpen((open) => {
      try {
        window.localStorage.setItem(DISCLOSURE_KEY, open ? "closed" : "open");
      } catch {
        // Ignore — the preference just won't persist.
      }
      return !open;
    });
  };

  const onSubmit = form.handleSubmit(() => {
    setFormError(undefined);
    const values = form.getValues();
    const fd = new FormData();

    // Always present.
    fd.set("occurred_on", values.occurred_on);
    fd.set("session_type", values.session_type);
    fd.set("minutes", values.minutes);

    // Optional — omit empties so the server stores null (not "").
    const setIf = (key: string, v: string | null) => {
      if (v !== null && v !== undefined && v.trim() !== "") fd.set(key, v);
    };
    setIf("focus", values.focus);
    setIf("drill", values.drill);
    setIf("result", values.result);
    setIf("notes", values.notes);

    if (mode === "edit" && sessionId) fd.set("id", sessionId);

    startTransition(async () => {
      const result =
        mode === "edit"
          ? await updatePracticeAction(fd)
          : await createPracticeAction(fd);
      // A successful action redirects (throws) and never returns a state object.
      if (!result) return;
      if (result.fieldErrors) {
        for (const [name, messages] of Object.entries(result.fieldErrors)) {
          const first = messages?.[0];
          if (first) {
            form.setError(name as keyof PracticeFormValues, { message: first });
          }
        }
      }
      if (result.error) setFormError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}

      {/* --- The 60-second core ------------------------------------------- */}
      <div className="flex flex-col gap-4">
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
          id="session_type"
          label="What did you work on?"
          error={errors.session_type?.message}
        >
          <Controller
            name="session_type"
            control={form.control}
            render={({ field }) => (
              <TypeGrid value={field.value} onChange={field.onChange} />
            )}
          />
        </FormField>

        <FormField
          id="minutes"
          label="How long?"
          hint="Tap a preset or type the minutes."
          error={errors.minutes?.message}
        >
          <Controller
            name="minutes"
            control={form.control}
            render={({ field }) => (
              <MinutesField
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={!!errors.minutes}
                describedBy={describedBy(
                  "minutes",
                  "Tap a preset or type the minutes.",
                  errors.minutes?.message,
                )}
              />
            )}
          />
        </FormField>
      </div>

      {/* --- Add detail ---------------------------------------------------- */}
      <div className="flex flex-col gap-4 border-t border-border pt-5">
        <button
          type="button"
          onClick={toggleDetail}
          aria-expanded={detailOpen}
          aria-controls="practice-detail"
          className="flex h-11 w-fit items-center gap-2 rounded-md px-1 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 transition-transform",
              detailOpen && "rotate-180",
            )}
          />
          Add detail
          <span className="text-muted-foreground">
            — focus, drill, how it went
          </span>
        </button>

        {/* The `hidden` attribute carries the collapse, and this element gets NO
            display utility of its own: Tailwind's preflight `[hidden]` rule and a
            `flex` utility have equal specificity, and utilities are emitted last,
            so a `flex` class here would silently beat `hidden` and the panel
            would never close. The layout lives on the inner wrapper instead. */}
        <div id="practice-detail" hidden={!detailOpen}>
          <div className="flex flex-col gap-4">
            <FormField id="focus" label="Focus" error={errors.focus?.message}>
              <Input
                id="focus"
                placeholder="e.g. Speed control"
                aria-invalid={!!errors.focus}
                aria-describedby={describedBy(
                  "focus",
                  undefined,
                  errors.focus?.message,
                )}
                {...form.register("focus")}
              />
            </FormField>

            <FormField id="drill" label="Drill" error={errors.drill?.message}>
              <Input
                id="drill"
                placeholder="e.g. Lag ladder to 20/30/40 ft"
                aria-invalid={!!errors.drill}
                aria-describedby={describedBy(
                  "drill",
                  undefined,
                  errors.drill?.message,
                )}
                {...form.register("drill")}
              />
            </FormField>

            <FormField
              id="result"
              label="Result"
              hint="What actually happened — the number you hit, or how it felt."
              error={errors.result?.message}
            >
              <Input
                id="result"
                placeholder="e.g. Made 18 of 20 from 4 ft"
                aria-invalid={!!errors.result}
                aria-describedby={describedBy(
                  "result",
                  "What actually happened — the number you hit, or how it felt.",
                  errors.result?.message,
                )}
                {...form.register("result")}
              />
            </FormField>

            <FormField id="notes" label="Notes" error={errors.notes?.message}>
              <Textarea
                id="notes"
                placeholder="Anything worth remembering next time."
                aria-invalid={!!errors.notes}
                aria-describedby={describedBy(
                  "notes",
                  undefined,
                  errors.notes?.message,
                )}
                {...form.register("notes")}
              />
            </FormField>
          </div>
        </div>
      </div>

      {/* --- Actions ------------------------------------------------------- */}
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
              : "Log session"}
        </Button>
      </div>
    </form>
  );
}

/**
 * The seven session types as a grid of big targets — the fastest way to pick one
 * with a thumb, and it puts the whole vocabulary on screen so two athletes sort
 * the same session into the same bucket. The selected type's gloss shows below,
 * which is where the sorting rules actually live.
 */
function TypeGrid({
  value,
  onChange,
}: {
  value: SessionType;
  onChange: (value: SessionType) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div
        role="group"
        aria-label="Session type"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {SESSION_TYPES.map((type) => {
          const selected = value === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => onChange(type)}
              aria-pressed={selected}
              className={cn(
                "flex h-12 items-center justify-center rounded-md border px-2 text-center text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-foreground hover:bg-muted",
              )}
            >
              {SESSION_TYPE_LABELS[type]}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground">
        {SESSION_TYPE_HINTS[value]}
      </p>
    </div>
  );
}

/**
 * Minutes: preset chips plus a free field. The presets cover almost every real
 * session, so the common case is one tap; the field is there for the range
 * session that ran long. A chip reads as pressed when it matches what's typed,
 * so the two controls never disagree about the same value.
 */
function MinutesField({
  value,
  onChange,
  onBlur,
  invalid,
  describedBy: describedByIds,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  invalid: boolean;
  describedBy?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div
        role="group"
        aria-label="Common session lengths"
        className="flex flex-wrap gap-2"
      >
        {MINUTE_PRESETS.map((preset) => {
          const selected = value === String(preset);
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(String(preset))}
              aria-pressed={selected}
              className={cn(
                "inline-flex h-11 min-w-14 items-center justify-center rounded-full border px-4 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-foreground hover:bg-muted",
              )}
            >
              {preset}m
            </button>
          );
        })}
      </div>
      <Input
        id="minutes"
        type="number"
        inputMode="numeric"
        min={1}
        max={600}
        step={1}
        placeholder="Minutes"
        className="data-value tabular-nums"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={invalid}
        aria-describedby={describedByIds}
      />
    </div>
  );
}
