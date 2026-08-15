"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataValue } from "@/components/ui/data-value";
import { FormField, describedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatMinutes } from "@/lib/practice/format";
import {
  SESSION_TYPE_HINTS,
  SESSION_TYPE_LABELS,
  emptySegment,
  practiceSchema,
  totalMinutes,
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
 * initial values and which action it calls.
 *
 * A session is a DAY'S BLOCK, so the discipline picker is a MULTI-SELECT: an
 * athlete at this level fills 1.5–3 hours a day, and that day routinely covers
 * exercise, swing work, short game and putting. Logging it as one session is both
 * fewer taps and a truer record than four separate entries.
 *
 * Each selected discipline then gets its OWN minutes box. That is the one piece
 * of friction this form insists on, and it is the whole reason the screen is
 * worth anything: the rollup and the ratio check are built entirely from these
 * numbers, and dividing a session total between disciplines would put figures
 * nobody entered into the one place the athlete is meant to act on.
 *
 * The single-discipline case stays as fast as it was — tap Putting, type 45,
 * save — and the running total sits under the rows so a 2.5-hour block can be
 * checked at a glance.
 *
 * It validates on the client with the SAME `practiceSchema` the server re-parses;
 * the server is the security boundary and RLS the backstop.
 */

const DISCLOSURE_KEY = "fairway.practice.detailOpen";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Nothing pre-picked. On a multi-select, a default selection is a claim about
 * what the athlete did, and it costs whoever didn't do it an extra tap to undo. */
function createDefaults(): PracticeFormValues {
  return { occurred_on: todayIso(), notes: null, segments: [] };
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
    // Deliberately NOT the `onBlur` the round and event forms use. Those have a
    // fixed set of fields; this one grows a minutes box each time a discipline is
    // picked, and the resolver validates the whole schema at once — so blurring
    // the first box would flag every box the athlete hasn't reached yet as "Enter
    // the minutes". Validating at submit and then live on change gives the same
    // protection without telling someone off for not having got there.
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "segments",
  });

  const errors = form.formState.errors;
  // Watched so the running total and the pressed state of each discipline chip
  // stay in step with what's actually in the form.
  const segments = form.watch("segments");
  const selected = new Set(segments?.map((s) => s.session_type));
  const total = totalMinutes(segments ?? []);

  /**
   * Toggling a discipline adds or removes its whole segment — including any
   * detail written against it, which is the honest behaviour: if the discipline
   * isn't part of the session, neither is its drill.
   *
   * A toggle always toggles, including down to nothing selected. Blocking the
   * last removal would make a mis-tap unfixable; "pick at least one" is a rule
   * the schema states plainly at submit instead.
   */
  const toggleType = (type: SessionType) => {
    const index = (segments ?? []).findIndex((s) => s.session_type === type);
    if (index >= 0) {
      remove(index);
      return;
    }
    append(emptySegment(type));
  };

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

    fd.set("occurred_on", values.occurred_on);
    if (values.notes && values.notes.trim() !== "")
      fd.set("notes", values.notes);

    // The segments ride as JSON: a variable-length list of objects flattened into
    // indexed form keys is a parser to get wrong on both sides for no gain. The
    // server re-parses it with the shared schema like any other input.
    fd.set(
      "segments",
      JSON.stringify(
        values.segments.map((s) => ({
          session_type: s.session_type,
          minutes: s.minutes,
          focus: s.focus,
          drill: s.drill,
          result: s.result,
        })),
      ),
    );

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
          // Server paths match the form's field names ("segments.0.minutes"), so
          // an error lands on the box that caused it.
          if (first) {
            form.setError(name as never, { message: first });
          }
        }
      }
      if (result.error) setFormError(result.error);
    });
  });

  const segmentsError =
    errors.segments?.message ?? errors.segments?.root?.message;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}

      {/* --- When ---------------------------------------------------------- */}
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

      {/* --- What ---------------------------------------------------------- */}
      <FormField
        id="segments"
        label="What did you work on?"
        hint="Tap everything this session covered."
        error={segmentsError}
      >
        <TypeGrid selected={selected} onToggle={toggleType} />
      </FormField>

      {/* --- How long on each ---------------------------------------------- */}
      {fields.length === 0 ? null : (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-medium text-foreground">
              How long on each?
            </h2>
            <p className="text-sm text-muted-foreground">
              Total{" "}
              <DataValue className="text-base text-foreground">
                {formatMinutes(total)}
              </DataValue>
            </p>
          </div>

          <ul className="flex flex-col gap-3">
            {fields.map((field, index) => {
              const type = segments?.[index]?.session_type ?? "putting";
              const error = errors.segments?.[index]?.minutes?.message;
              const id = `segments.${index}.minutes`;
              return (
                <li
                  key={field.id}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg border border-border bg-card px-3 py-3"
                >
                  <div className="flex min-w-0 flex-col">
                    <label
                      htmlFor={id}
                      className="text-sm font-medium text-foreground"
                    >
                      {SESSION_TYPE_LABELS[type]}
                    </label>
                    {/* The gloss lives here rather than under the picker: with
                        four disciplines selected, concatenating them up there was
                        a wall of text, and this is the moment it actually helps —
                        the athlete is deciding which minutes go in this bucket. */}
                    <span className="truncate text-sm text-muted-foreground">
                      {SESSION_TYPE_HINTS[type]}
                    </span>
                    {error ? (
                      <span
                        id={`${id}-error`}
                        role="alert"
                        className="text-sm font-medium text-destructive"
                      >
                        {error}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Input
                      id={id}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={600}
                      step={1}
                      placeholder="45"
                      className="data-value w-24 tabular-nums"
                      aria-invalid={!!error}
                      aria-describedby={error ? `${id}-error` : undefined}
                      {...form.register(`segments.${index}.minutes`)}
                    />
                    <span className="text-sm text-muted-foreground">min</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

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
          <div className="flex flex-col gap-5">
            {/* Detail is per DISCIPLINE, because that is what it describes:
                "made 18 of 20 from 4 ft" is about the putting, not the afternoon. */}
            {fields.map((field, index) => {
              const type = segments?.[index]?.session_type ?? "putting";
              return (
                <fieldset key={field.id} className="flex flex-col gap-3">
                  <legend className="text-sm font-semibold text-foreground">
                    {SESSION_TYPE_LABELS[type]}
                  </legend>
                  <FormField id={`segments.${index}.focus`} label="Focus">
                    <Input
                      id={`segments.${index}.focus`}
                      placeholder="e.g. Speed control"
                      {...form.register(`segments.${index}.focus`)}
                    />
                  </FormField>
                  <FormField id={`segments.${index}.drill`} label="Drill">
                    <Input
                      id={`segments.${index}.drill`}
                      placeholder="e.g. Lag ladder to 20/30/40 ft"
                      {...form.register(`segments.${index}.drill`)}
                    />
                  </FormField>
                  <FormField id={`segments.${index}.result`} label="Result">
                    <Input
                      id={`segments.${index}.result`}
                      placeholder="e.g. Made 18 of 20 from 4 ft"
                      {...form.register(`segments.${index}.result`)}
                    />
                  </FormField>
                </fieldset>
              );
            })}

            <FormField
              id="notes"
              label="Notes"
              hint="About the session as a whole."
              error={errors.notes?.message}
            >
              <Textarea
                id="notes"
                placeholder="Anything worth remembering next time."
                aria-invalid={!!errors.notes}
                aria-describedby={describedBy(
                  "notes",
                  "About the session as a whole.",
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
 * The seven disciplines as a grid of big toggles — multi-select, because a day's
 * training is usually several of them. Selected ones read `aria-pressed`, and the
 * gloss beneath names what belongs in each bucket, which is where the sorting
 * rules actually live: the rollup is only as honest as two athletes filing the
 * same work the same way.
 */
function TypeGrid({
  selected,
  onToggle,
}: {
  selected: Set<SessionType>;
  onToggle: (type: SessionType) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div
        role="group"
        aria-label="Disciplines worked on"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {SESSION_TYPES.map((type) => {
          const isSelected = selected.has(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => onToggle(type)}
              aria-pressed={isSelected}
              className={cn(
                "flex h-12 items-center justify-center rounded-md border px-2 text-center text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-foreground hover:bg-muted",
              )}
            >
              {SESSION_TYPE_LABELS[type]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
