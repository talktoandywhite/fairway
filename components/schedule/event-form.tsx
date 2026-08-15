"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { FormField, describedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  EVENT_PRIORITIES,
  EVENT_PRIORITY_LABELS,
  EVENT_STATUSES,
  EVENT_STATUS_LABELS,
  HOLE_OPTIONS,
  eventSchema,
  type EventFormValues,
  type Holes,
} from "@/lib/schemas/event";
import type { TourOption } from "@/lib/schedule/queries";

import {
  createEventAction,
  updateEventAction,
} from "@/app/(app)/schedule/actions";
import { FormAlert } from "@/app/(auth)/_components/form-alert";

/**
 * The event form — create and edit share it; the only differences are the initial
 * values and which action it calls. It validates on the client with the SAME
 * `eventSchema` the server re-parses (CLAUDE.md: shared schema), but the server is
 * the security boundary and RLS the backstop.
 *
 * The fee is typed in dollars and stored as integer cents — the schema does that
 * conversion, so this form only ever holds the dollars string the athlete typed.
 * The FormData is built from `getValues()` (the raw store) rather than the
 * submit-handler argument, so the schema's dollars→cents rename can never drop the
 * field regardless of resolver plumbing.
 */

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function createDefaults(): EventFormValues {
  return {
    name: "",
    plays_on: todayIso(),
    tour_id: null,
    course: null,
    city: null,
    holes: 18,
    entry_fee: "",
    priority: "optional",
    status: "not_registered",
    notes: null,
  };
}

export function EventForm({
  mode,
  eventId,
  tours,
  initialValues,
}: {
  mode: "create" | "edit";
  eventId?: string;
  /** The shared tour catalog, for the optional tour picker. */
  tours: TourOption[];
  /** Prefill for edit mode; ignored in create mode. */
  initialValues?: EventFormValues;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [formError, setFormError] = React.useState<string | undefined>();

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema) as Resolver<EventFormValues>,
    defaultValues: initialValues ?? createDefaults(),
    mode: "onBlur",
  });

  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(() => {
    setFormError(undefined);
    const values = form.getValues();
    const fd = new FormData();

    // Always present.
    fd.set("name", values.name);
    fd.set("plays_on", values.plays_on);
    fd.set("holes", String(values.holes));
    fd.set("priority", values.priority);
    fd.set("status", values.status);

    // Optional — omit empties so the server stores null (not "").
    const setIf = (key: string, v: string | null) => {
      if (v !== null && v !== undefined && v.trim() !== "") fd.set(key, v);
    };
    setIf("tour_id", values.tour_id);
    setIf("course", values.course);
    setIf("city", values.city);
    setIf("entry_fee", values.entry_fee);
    setIf("notes", values.notes);

    if (mode === "edit" && eventId) fd.set("id", eventId);

    startTransition(async () => {
      const result =
        mode === "edit"
          ? await updateEventAction(fd)
          : await createEventAction(fd);
      // A successful action redirects (throws) and never returns a state object.
      if (!result) return;
      if (result.fieldErrors) {
        for (const [name, messages] of Object.entries(result.fieldErrors)) {
          const first = messages?.[0];
          if (first) {
            form.setError(name as keyof EventFormValues, { message: first });
          }
        }
      }
      if (result.error) setFormError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}

      {/* --- What & when --------------------------------------------------- */}
      <div className="flex flex-col gap-4">
        <FormField id="name" label="Event name" error={errors.name?.message}>
          <Input
            id="name"
            placeholder="e.g. NTPGA Medalist #1"
            aria-invalid={!!errors.name}
            aria-describedby={describedBy(
              "name",
              undefined,
              errors.name?.message,
            )}
            {...form.register("name")}
          />
        </FormField>

        <FormField id="plays_on" label="Date" error={errors.plays_on?.message}>
          <Input
            id="plays_on"
            type="date"
            aria-invalid={!!errors.plays_on}
            aria-describedby={describedBy(
              "plays_on",
              undefined,
              errors.plays_on?.message,
            )}
            {...form.register("plays_on")}
          />
        </FormField>

        <FormField
          id="tour_id"
          label="Tour"
          hint="Optional — links this event to a tour on the shared catalog."
          error={errors.tour_id?.message}
        >
          <Select
            id="tour_id"
            aria-invalid={!!errors.tour_id}
            aria-describedby={describedBy(
              "tour_id",
              "Optional — links this event to a tour on the shared catalog.",
              errors.tour_id?.message,
            )}
            {...form.register("tour_id")}
          >
            <option value="">No tour</option>
            {tours.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      {/* --- Where --------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="course" label="Course" error={errors.course?.message}>
          <Input
            id="course"
            placeholder="e.g. Tenison Highlands"
            aria-invalid={!!errors.course}
            aria-describedby={describedBy(
              "course",
              undefined,
              errors.course?.message,
            )}
            {...form.register("course")}
          />
        </FormField>

        <FormField id="city" label="City" error={errors.city?.message}>
          <Input
            id="city"
            placeholder="e.g. Dallas"
            aria-invalid={!!errors.city}
            aria-describedby={describedBy(
              "city",
              undefined,
              errors.city?.message,
            )}
            {...form.register("city")}
          />
        </FormField>
      </div>

      {/* --- Format, fee, priority, status --------------------------------- */}
      <div className="flex flex-col gap-4">
        <FormField id="holes" label="Holes" error={errors.holes?.message}>
          <Controller
            name="holes"
            control={form.control}
            render={({ field }) => (
              <SegmentedHoles value={field.value} onChange={field.onChange} />
            )}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField
            id="entry_fee"
            label="Entry fee"
            hint="Leave blank if unknown."
            error={errors.entry_fee?.message}
          >
            <div className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                $
              </span>
              <Input
                id="entry_fee"
                type="text"
                inputMode="decimal"
                placeholder="85"
                className="data-value pl-7 tabular-nums"
                aria-invalid={!!errors.entry_fee}
                aria-describedby={describedBy(
                  "entry_fee",
                  "Leave blank if unknown.",
                  errors.entry_fee?.message,
                )}
                {...form.register("entry_fee")}
              />
            </div>
          </FormField>

          <FormField
            id="priority"
            label="Priority"
            error={errors.priority?.message}
          >
            <Select
              id="priority"
              aria-invalid={!!errors.priority}
              aria-describedby={describedBy(
                "priority",
                undefined,
                errors.priority?.message,
              )}
              {...form.register("priority")}
            >
              {EVENT_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {EVENT_PRIORITY_LABELS[p]}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField id="status" label="Status" error={errors.status?.message}>
            <Select
              id="status"
              aria-invalid={!!errors.status}
              aria-describedby={describedBy(
                "status",
                undefined,
                errors.status?.message,
              )}
              {...form.register("status")}
            >
              {EVENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {EVENT_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <FormField id="notes" label="Notes" error={errors.notes?.message}>
          <Textarea
            id="notes"
            placeholder="Tee time, travel, who's coming, anything to remember."
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
              : "Add event"}
        </Button>
      </div>
    </form>
  );
}

/** Holes toggle — 9 or 18, the only two the DB allows. Mirrors the round form's
 * segmented control: a big pair of targets is the fastest thing on a phone. */
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
