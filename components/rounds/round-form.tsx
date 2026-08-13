"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormField, describedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  DETAIL_COUNT_FIELDS,
  DETAIL_FIELD_LABELS,
  HOLE_OPTIONS,
  ROUND_TYPES,
  ROUND_TYPE_LABELS,
  defaultsForType,
  roundSchema,
  type Holes,
  type RoundFormValues,
} from "@/lib/schemas/round";

import {
  createRoundAction,
  updateRoundAction,
} from "@/app/(app)/rounds/actions";
import { FormAlert } from "@/app/(auth)/_components/form-alert";
import { Stepper } from "./stepper";

/**
 * The Score Log form — the most important screen in the app, and the one held to
 * the 60-second parking-lot standard (CLAUDE.md design principle #2). It is used
 * for both new and edit; the only differences are the initial values and which
 * action it calls.
 *
 * Shape of the screen, top to bottom:
 *   - Six REQUIRED core fields and nothing else above the fold: date, course,
 *     type, holes, par, score. A ten-year-old can stop here.
 *   - An "Add detail" disclosure holding the eight nullable leak stats and notes.
 *     Its open/closed state is remembered per user in localStorage (a UI
 *     preference — not athlete data, so it never touches the database).
 *
 * The whole point of the detail fields is that an un-entered one stays `null`
 * ("not recorded"), never `0`. The steppers hold `null` when empty and the
 * submit builder omits null/empty keys, so the shared `roundSchema` stores `null`
 * server-side. See `lib/schemas/round.ts`.
 */

const DISCLOSURE_KEY = "fairway.rounds.detailOpen";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** The create-mode starting point: today, a tournament, 18 holes / par 72, everything else empty. */
function createDefaults(): RoundFormValues {
  return {
    played_on: todayIso(),
    course: "",
    round_type: "tournament",
    holes: 18,
    par: 72,
    score: null,
    penalty_strokes: null,
    three_putts: null,
    total_putts: null,
    fairways_hit: null,
    fairways_possible: null,
    greens_in_regulation: null,
    up_and_downs: null,
    doubles_or_worse: null,
    notes: null,
  };
}

export function RoundForm({
  mode,
  roundId,
  courses,
  initialValues,
}: {
  mode: "create" | "edit";
  roundId?: string;
  /** Distinct course names from the athlete's own history, for autocomplete. */
  courses: string[];
  /** Prefill for edit mode; ignored in create mode. */
  initialValues?: RoundFormValues;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [formError, setFormError] = React.useState<string | undefined>();

  const form = useForm<RoundFormValues>({
    // The shared schema validates on the client here and again in the action.
    resolver: zodResolver(roundSchema) as Resolver<RoundFormValues>,
    defaultValues: initialValues ?? createDefaults(),
    mode: "onBlur",
  });

  const errors = form.formState.errors;

  // Type-driven defaults: switching the round type snaps holes/par to that type's
  // defaults — but only for fields the athlete hasn't edited themselves, so a par
  // they typed is never stomped. In edit mode the first render is skipped so
  // loading a saved round doesn't rewrite its holes/par.
  const holesEdited = React.useRef(mode === "edit");
  const parEdited = React.useRef(mode === "edit");
  const roundType = form.watch("round_type");
  const isFirstTypeRun = React.useRef(true);
  React.useEffect(() => {
    if (isFirstTypeRun.current) {
      isFirstTypeRun.current = false;
      return;
    }
    const d = defaultsForType(roundType);
    if (!holesEdited.current) form.setValue("holes", d.holes);
    if (!parEdited.current) form.setValue("par", d.par);
  }, [roundType, form]);

  // "Add detail" open state, remembered per user. Defaults closed on the server
  // and first paint to avoid a hydration mismatch, then syncs from localStorage.
  const [detailOpen, setDetailOpen] = React.useState(false);
  React.useEffect(() => {
    try {
      if (window.localStorage.getItem(DISCLOSURE_KEY) === "open") {
        setDetailOpen(true);
      }
    } catch {
      // localStorage unavailable (private mode, etc.) — the form still works.
    }
  }, []);
  const toggleDetail = () => {
    setDetailOpen((open) => {
      const next = !open;
      try {
        window.localStorage.setItem(DISCLOSURE_KEY, next ? "open" : "closed");
      } catch {
        // Ignore — persistence is a nicety, not a requirement.
      }
      return next;
    });
  };
  // If a detail field somehow fails validation, force the panel open so the error
  // is reachable rather than hidden behind a collapsed disclosure.
  const hasDetailError =
    DETAIL_COUNT_FIELDS.some((f) => errors[f]) || !!errors.notes;
  const detailExpanded = detailOpen || hasDetailError;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(undefined);
    const fd = new FormData();

    // Required core — always present (the resolver blocks submit otherwise).
    fd.set("played_on", values.played_on);
    fd.set("course", values.course);
    fd.set("round_type", values.round_type);
    fd.set("holes", String(values.holes));

    // Everything else: include a real value (0 counts!), omit null/empty so the
    // server stores null. `0 !== null` and `0 !== ""`, so a recorded zero rides
    // along while an untouched field drops out.
    const setIf = (key: string, v: number | string | null) => {
      if (v !== null && v !== undefined && v !== "") fd.set(key, String(v));
    };
    setIf("par", values.par);
    setIf("score", values.score);
    for (const field of DETAIL_COUNT_FIELDS) setIf(field, values[field]);
    setIf("notes", values.notes);

    if (mode === "edit" && roundId) fd.set("id", roundId);

    startTransition(async () => {
      const result =
        mode === "edit"
          ? await updateRoundAction(fd)
          : await createRoundAction(fd);
      // A successful action redirects (throws) and never returns a state object.
      if (!result) return;
      if (result.fieldErrors) {
        for (const [name, messages] of Object.entries(result.fieldErrors)) {
          const first = messages?.[0];
          if (first) {
            form.setError(name as keyof RoundFormValues, { message: first });
          }
        }
      }
      if (result.error) setFormError(result.error);
    });
  });

  const courseListId = "round-course-options";

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}

      {/* --- Required core ------------------------------------------------- */}
      <div className="flex flex-col gap-4">
        <FormField
          id="played_on"
          label="Date played"
          error={errors.played_on?.message}
        >
          <Input
            id="played_on"
            type="date"
            max={todayIso()}
            aria-invalid={!!errors.played_on}
            aria-describedby={describedBy(
              "played_on",
              undefined,
              errors.played_on?.message,
            )}
            {...form.register("played_on")}
          />
        </FormField>

        <FormField
          id="course"
          label="Course"
          error={errors.course?.message}
          hint={
            courses.length
              ? "Start typing to pick a course you've played."
              : undefined
          }
        >
          <Input
            id="course"
            list={courses.length ? courseListId : undefined}
            autoComplete="off"
            placeholder="e.g. Tenison Highlands"
            aria-invalid={!!errors.course}
            aria-describedby={describedBy(
              "course",
              courses.length
                ? "Start typing to pick a course you've played."
                : undefined,
              errors.course?.message,
            )}
            {...form.register("course")}
          />
          {courses.length ? (
            <datalist id={courseListId}>
              {courses.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          ) : null}
        </FormField>

        <FormField
          id="round_type"
          label="Round type"
          error={errors.round_type?.message}
        >
          <Select
            id="round_type"
            aria-invalid={!!errors.round_type}
            aria-describedby={describedBy(
              "round_type",
              undefined,
              errors.round_type?.message,
            )}
            {...form.register("round_type")}
          >
            {ROUND_TYPES.map((t) => (
              <option key={t} value={t}>
                {ROUND_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField id="holes" label="Holes" error={errors.holes?.message}>
          <Controller
            name="holes"
            control={form.control}
            render={({ field }) => (
              <SegmentedHoles
                value={field.value}
                onChange={(h) => {
                  holesEdited.current = true;
                  field.onChange(h);
                }}
              />
            )}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField id="par" label="Par" error={errors.par?.message}>
            <Input
              id="par"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="data-value tabular-nums"
              aria-invalid={!!errors.par}
              aria-describedby={describedBy(
                "par",
                undefined,
                errors.par?.message,
              )}
              {...form.register("par", {
                setValueAs: (v) =>
                  v === "" || v === null || v === undefined ? null : Number(v),
                onChange: () => {
                  parEdited.current = true;
                },
              })}
            />
          </FormField>

          <FormField id="score" label="Score" error={errors.score?.message}>
            <Input
              id="score"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="data-value tabular-nums"
              aria-invalid={!!errors.score}
              aria-describedby={describedBy(
                "score",
                undefined,
                errors.score?.message,
              )}
              {...form.register("score", {
                setValueAs: (v) =>
                  v === "" || v === null || v === undefined ? null : Number(v),
              })}
            />
          </FormField>
        </div>
      </div>

      {/* --- Add detail (progressive disclosure) --------------------------- */}
      <div className="rounded-lg border border-border">
        <button
          type="button"
          onClick={toggleDetail}
          aria-expanded={detailExpanded}
          aria-controls="round-detail-panel"
          className="flex w-full items-center justify-between gap-2 rounded-lg px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span>
            Add detail
            <span className="ml-2 font-normal text-muted-foreground">
              penalties, putts, fairways &amp; more — all optional
            </span>
          </span>
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              detailExpanded && "rotate-180",
            )}
          />
        </button>

        <div
          id="round-detail-panel"
          hidden={!detailExpanded}
          className="flex flex-col gap-4 border-t border-border px-4 py-4"
        >
          <p className="text-sm text-muted-foreground">
            Leave anything you didn&apos;t track blank — blank means &quot;not
            recorded&quot;, which is different from zero.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {DETAIL_COUNT_FIELDS.map((fieldName) => (
              <FormField
                key={fieldName}
                id={fieldName}
                label={DETAIL_FIELD_LABELS[fieldName]}
                error={errors[fieldName]?.message}
              >
                <Controller
                  name={fieldName}
                  control={form.control}
                  render={({ field }) => (
                    <Stepper
                      id={fieldName}
                      label={DETAIL_FIELD_LABELS[fieldName].toLowerCase()}
                      value={field.value}
                      onChange={field.onChange}
                      invalid={!!errors[fieldName]}
                      ariaDescribedBy={describedBy(
                        fieldName,
                        undefined,
                        errors[fieldName]?.message,
                      )}
                    />
                  )}
                />
              </FormField>
            ))}
          </div>

          <FormField id="notes" label="Notes" error={errors.notes?.message}>
            <Textarea
              id="notes"
              placeholder="What happened out there? e.g. two OB off the tee, putting felt good."
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
              : "Log round"}
        </Button>
      </div>
    </form>
  );
}

/**
 * The holes control — a two-option segmented toggle rather than a stepper or a
 * free-text box, because holes is only ever 9 or 18 and a big pair of targets is
 * the fastest, least error-prone thing on a phone.
 */
function SegmentedHoles({
  value,
  onChange,
}: {
  value: Holes;
  onChange: (value: Holes) => void;
}) {
  return (
    <div role="group" aria-label="Holes" className="grid grid-cols-2 gap-2">
      {HOLE_OPTIONS.map((option) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={selected}
            className={cn(
              "flex h-11 items-center justify-center rounded-md border text-base font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background text-foreground hover:bg-muted",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
