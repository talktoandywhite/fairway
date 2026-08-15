import { z } from "zod";

import { SESSION_TYPES } from "@/lib/stats";
import type { SessionType } from "@/lib/stats";

/**
 * The practice session (Practice Log) schema — shared verbatim by the client form
 * (React Hook Form) and the server actions (CLAUDE.md: "Zod schemas are shared
 * between client validation and server actions"). The server re-parses with this
 * on every mutation; the client copy is a UX layer, never the security boundary,
 * and RLS is the real one underneath.
 *
 * A session is a DAY'S BLOCK holding one or more SEGMENTS. That shape exists
 * because it is how athletes at this level actually train: an afternoon covers
 * exercise, then swing work, then short game, then putting, and splitting that
 * into four separate sessions is both tedious and untrue.
 *
 * Three rules this file guards:
 *   - **A session has at least one segment.** A block with no disciplines in it
 *     is not a practice session, and it would sit in the log contributing zero
 *     minutes while still looking logged.
 *   - **Every segment carries its OWN minutes**, required and positive. Nothing
 *     here ever divides a session total between disciplines: the minutes-by-type
 *     rollup and the ratio check are only as honest as this field, and an
 *     inferred split would put numbers into them that nobody typed. The DB agrees
 *     (`practice_segment_minutes_ok check (minutes > 0)`).
 *   - **A discipline appears at most once per session**, matching the
 *     multi-select the form offers and the DB's unique constraint. Two putting
 *     rows in one block is a double-submit, not a record.
 *
 * `SESSION_TYPES` is imported from the stats engine rather than redeclared: it
 * already carries the compile-time guard against drift from the Postgres enum,
 * and the rollup keys off the same array, so one list is the only honest number.
 */

/** Human labels for the discipline picker, the list, and the rollup. Kept short —
 * they are chart tick labels and 375px-wide buttons as well as prose. */
export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  range_full_swing: "Full swing",
  range_wedges: "Wedges",
  short_game: "Short game",
  putting: "Putting",
  on_course: "On course",
  exercise: "Exercise",
  lesson: "Lesson",
};

/** A one-line gloss per discipline, for the picker and the rollup table. Says
 * what belongs in the bucket so two athletes log the same work the same way —
 * the rollup is only as honest as the sorting. */
export const SESSION_TYPE_HINTS: Record<SessionType, string> = {
  range_full_swing: "Driver and irons on the range",
  range_wedges: "Wedges to a number, 40–110 yards",
  short_game: "Chipping, pitching, bunkers, green reading",
  putting: "Putting green — speed and short putts",
  on_course: "Playing holes, not hitting balls",
  exercise: "Strength, conditioning, mobility",
  lesson: "Time with a coach",
};

/** Ten hours on one discipline in one day. Past this it is not one segment, and
 * the smallint column would still take it, so the schema is where the ceiling
 * lives. */
const MINUTES_MAX = 600;

// --------------------------------------------------------------------------
// Field-level pieces
// --------------------------------------------------------------------------

/** `YYYY-MM-DD` calendar day, real and not in the future (practice is done, then
 * logged). Compared as UTC calendar days, matching how the dates are stored. */
const occurredOn = z
  .string()
  .trim()
  .min(1, "Enter the date you practiced")
  .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), "Enter a valid date")
  .refine((v) => {
    const t = Date.parse(`${v}T12:00:00Z`);
    return !Number.isNaN(t);
  }, "Enter a valid date")
  .refine((v) => {
    const today = new Date().toISOString().slice(0, 10);
    return v <= today;
  }, "That date is in the future");

/**
 * Minutes on one discipline — required, whole, positive. An empty value fails as
 * "required" rather than coercing to a misleading 0, and 0 itself is rejected: a
 * discipline you spent no time on is one you did not select.
 */
const minutes = z.preprocess(
  (v) => {
    if (v === "" || v === null || v === undefined) return undefined;
    if (typeof v === "string") {
      const trimmed = v.trim();
      return trimmed === "" ? undefined : Number(trimmed);
    }
    return v;
  },
  z
    .number({
      required_error: "Enter the minutes",
      invalid_type_error: "Enter the minutes as a number, e.g. 45",
    })
    .int("Minutes must be a whole number")
    .min(1, "Enter at least 1 minute")
    .max(MINUTES_MAX, "That's more than 10 hours on one thing"),
) as z.ZodType<number>;

/** An optional trimmed string that stores `null` (not "") when left blank. */
function optionalText(max: number, label: string): z.ZodType<string | null> {
  return z.preprocess(
    (v) => {
      if (v === null || v === undefined) return null;
      if (typeof v === "string") {
        const trimmed = v.trim();
        return trimmed === "" ? null : trimmed;
      }
      return v;
    },
    z.string().max(max, `Keep ${label} under ${max} characters`).nullable(),
  ) as z.ZodType<string | null>;
}

// --------------------------------------------------------------------------
// The schema
// --------------------------------------------------------------------------

/** One discipline within a session, with its own minutes and its own detail. */
export const practiceSegmentSchema = z.object({
  session_type: z.enum(SESSION_TYPES, {
    required_error: "Choose what you worked on",
    invalid_type_error: "Choose what you worked on",
  }),
  minutes,
  focus: optionalText(120, "the focus"),
  drill: optionalText(200, "the drill"),
  result: optionalText(200, "the result"),
});

export type PracticeSegmentInput = z.output<typeof practiceSegmentSchema>;

/**
 * Input shape validated on both client and server. The parsed output splits
 * cleanly into the `practice_sessions` row (date, notes) and the
 * `practice_segments` rows the action writes beneath it.
 */
export const practiceSchema = z.object({
  occurred_on: occurredOn,
  notes: optionalText(2000, "notes"),
  segments: z
    .array(practiceSegmentSchema)
    .min(1, "Pick at least one thing you worked on")
    .max(SESSION_TYPES.length, "That's more disciplines than exist")
    .refine(
      (segments) =>
        new Set(segments.map((s) => s.session_type)).size === segments.length,
      "Each discipline can only be logged once per session",
    ),
});

/** The validated session — what a server action writes (minus athlete_id). */
export type PracticeInput = z.output<typeof practiceSchema>;

/**
 * The shape React Hook Form holds. Distinct from `PracticeInput` in one place:
 * while the athlete is still filling it in, each segment's `minutes` lives as the
 * raw string its input holds (empty = nothing entered yet), and only becomes an
 * integer on parse. Keeping the form type honest about that avoids a "0 vs blank"
 * bug in the field that every number on the Practice screen is built from.
 */
export type PracticeSegmentFormValues = {
  session_type: SessionType;
  /** Minutes, as typed. "" means nothing entered yet (→ a required-field error). */
  minutes: string;
  focus: string | null;
  drill: string | null;
  result: string | null;
};

export type PracticeFormValues = {
  occurred_on: string;
  notes: string | null;
  segments: PracticeSegmentFormValues[];
};

/** A blank segment for a discipline the athlete has just selected. */
export function emptySegment(
  session_type: SessionType,
): PracticeSegmentFormValues {
  return { session_type, minutes: "", focus: null, drill: null, result: null };
}

/**
 * Total minutes across a session's segments, for the form's live total and the
 * list's per-session figure. Segment minutes are summed, never divided — see the
 * header. Non-numeric or empty entries count as 0 so a half-filled form still
 * shows a running total rather than `NaN`.
 */
export function totalMinutes(segments: { minutes: string | number }[]): number {
  return segments.reduce((sum, s) => {
    const value = typeof s.minutes === "number" ? s.minutes : Number(s.minutes);
    return sum + (Number.isFinite(value) && value > 0 ? value : 0);
  }, 0);
}
