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
 * Two things this file guards:
 *   - `minutes` is REQUIRED and must be positive. Unlike a round's optional leak
 *     counts, there is no such thing as a practice session of unrecorded length —
 *     the minutes-by-type rollup and the ratio check are the whole point of the
 *     log, and a null-minutes row would silently distort both. The DB agrees
 *     (`practice_minutes_ok check (minutes > 0)`).
 *   - `occurred_on` is a calendar day and may NOT be in the future. Practice is
 *     done, then logged — the same rule as a round (see `lib/schemas/round.ts`),
 *     and the opposite of an event, which is usually a plan.
 *
 * `SESSION_TYPES` is imported from the stats engine rather than redeclared here:
 * it already carries the compile-time guard against drift from the Postgres enum,
 * and the rollup keys off the same array, so one list is the only honest number.
 */

/** Human labels for the type picker, the list, and the rollup. Kept short — they
 * are chart tick labels and 375px-wide buttons as well as prose. */
export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  range_full_swing: "Full swing",
  range_wedges: "Wedges",
  short_game: "Short game",
  putting: "Putting",
  on_course: "On course",
  gym: "Gym",
  lesson: "Lesson",
};

/** A one-line gloss per type, for the picker's helper text and the rollup table.
 * Says what belongs in the bucket so two athletes log the same session the same
 * way — the rollup is only as honest as the sorting. */
export const SESSION_TYPE_HINTS: Record<SessionType, string> = {
  range_full_swing: "Driver and irons on the range",
  range_wedges: "Wedges to a number, 40–110 yards",
  short_game: "Chipping, pitching, bunkers, green reading",
  putting: "Putting green — speed and short putts",
  on_course: "Playing holes, not hitting balls",
  gym: "Strength and conditioning",
  lesson: "Time with a coach",
};

/**
 * The minute presets on the quick-add form. A tap on one of these is the whole
 * interaction for most sessions — the 60-second parking-lot standard (CLAUDE.md
 * design principle #2) — with the free-text field there for anything else.
 */
export const MINUTE_PRESETS = [15, 30, 45, 60, 90, 120] as const;

/** Ten hours. Past this it is not one session, and the smallint column would
 * still take it, so the schema is where the ceiling lives. */
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
 * Minutes practiced — required, whole, positive. An empty value fails as
 * "required" rather than coercing to a misleading 0, and 0 itself is rejected:
 * a zero-minute session is a row that dilutes nothing but confuses everything.
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
      required_error: "Enter how long you practiced",
      invalid_type_error: "Enter the minutes as a number, e.g. 45",
    })
    .int("Minutes must be a whole number")
    .min(1, "Enter at least 1 minute")
    .max(MINUTES_MAX, "That's more than 10 hours — split it into two sessions"),
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

/**
 * Input shape validated on both client and server. The parsed output matches the
 * `practice_sessions` columns exactly (minus `athlete_id`, which the server
 * stamps from the resolved owner), so it can be spread straight into an insert.
 */
export const practiceSchema = z.object({
  occurred_on: occurredOn,
  session_type: z.enum(SESSION_TYPES, {
    required_error: "Choose what you worked on",
    invalid_type_error: "Choose what you worked on",
  }),
  minutes,
  focus: optionalText(120, "the focus"),
  drill: optionalText(200, "the drill"),
  result: optionalText(200, "the result"),
  notes: optionalText(2000, "notes"),
});

/** The validated practice session — what a server action writes (minus athlete_id). */
export type PracticeInput = z.output<typeof practiceSchema>;

/**
 * The shape React Hook Form holds. Distinct from `PracticeInput` in one place:
 * while the athlete is still filling it in, `minutes` lives as the raw string the
 * number input holds (empty = nothing entered yet), and only becomes an integer
 * on parse. Keeping the form type honest about that avoids a "0 vs blank" bug.
 */
export type PracticeFormValues = {
  occurred_on: string;
  session_type: SessionType;
  /** Minutes, as typed. "" means nothing entered yet (→ a required-field error). */
  minutes: string;
  focus: string | null;
  drill: string | null;
  result: string | null;
  notes: string | null;
};
