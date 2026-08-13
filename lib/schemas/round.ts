import { z } from "zod";

import type { Database } from "@/types/database";

/**
 * The round (Score Log) schema — shared verbatim by the client form (React Hook
 * Form) and the server action (CLAUDE.md: "Zod schemas are shared between client
 * validation and server actions"). The server re-parses with this on every call;
 * the client copy is a UX layer, never the security boundary, and RLS is the
 * real one underneath.
 *
 * The single highest-stakes rule in this file: an un-entered detail field parses
 * to `null`, never `0`. The stats engine's `averagePerRound` skips nulls from
 * both numerator and denominator (a round where three-putts was not recorded is
 * not a round with zero three-putts), so a stray `0` here would silently corrupt
 * every leak average downstream. The `optionalCount` preprocessor below is what
 * guarantees empty → null, and `round.test.ts` pins it.
 */

// --------------------------------------------------------------------------
// round_type — kept in lockstep with the Postgres enum via a compile-time guard
// --------------------------------------------------------------------------

export const ROUND_TYPES = [
  "tournament",
  "practice_round",
  "simulated_tournament",
  "nine_hole",
] as const satisfies readonly Database["public"]["Enums"]["round_type"][];

export type RoundType = (typeof ROUND_TYPES)[number];

// Fails compilation if the DB enum and this list ever drift apart.
type _MissingRoundType = Exclude<
  Database["public"]["Enums"]["round_type"],
  RoundType
>;
type _RoundTypesAreExhaustive = _MissingRoundType extends never
  ? true
  : ["round_type missing from ROUND_TYPES:", _MissingRoundType];
const _roundTypesAreExhaustive: _RoundTypesAreExhaustive = true;
void _roundTypesAreExhaustive;

/** Human labels for the type selector and the list/detail views. */
export const ROUND_TYPE_LABELS: Record<RoundType, string> = {
  tournament: "Tournament",
  practice_round: "Practice round",
  simulated_tournament: "Simulated tournament",
  nine_hole: "Nine-hole",
};

export const HOLE_OPTIONS = [9, 18] as const;
export type Holes = (typeof HOLE_OPTIONS)[number];

/**
 * Type-driven defaults: a nine-hole round starts at 9 holes / par 36, everything
 * else at 18 / par 72. The form applies these only to fields the athlete has not
 * touched (see `round-form.tsx`), so switching type never stomps a value they
 * typed in themselves.
 */
export function defaultsForType(type: RoundType): {
  holes: Holes;
  par: number;
} {
  return type === "nine_hole" ? { holes: 9, par: 36 } : { holes: 18, par: 72 };
}

// --------------------------------------------------------------------------
// Field-level pieces
// --------------------------------------------------------------------------

/**
 * The eight nullable numeric detail columns, in the order they appear on the
 * form's "Add detail" expander. Every one is a per-round leak measurement the
 * dashboard averages, so every one is nullable and defaults to "not recorded".
 */
export const DETAIL_COUNT_FIELDS = [
  "penalty_strokes",
  "three_putts",
  "total_putts",
  "fairways_hit",
  "fairways_possible",
  "greens_in_regulation",
  "up_and_downs",
  "doubles_or_worse",
] as const;

export type DetailCountField = (typeof DETAIL_COUNT_FIELDS)[number];

/** Human labels for the eight detail (leak) counts — shared by the form and detail view. */
export const DETAIL_FIELD_LABELS: Record<DetailCountField, string> = {
  penalty_strokes: "Penalty strokes",
  three_putts: "Three-putts",
  total_putts: "Total putts",
  fairways_hit: "Fairways hit",
  fairways_possible: "Fairways possible",
  greens_in_regulation: "Greens in regulation",
  up_and_downs: "Up and downs",
  doubles_or_worse: "Doubles or worse",
};

/** A count that may legitimately be zero but never negative, capped generously. */
const COUNT_MAX = 200;

/**
 * A REQUIRED whole-number count (holes/par/score). Accepts a number (RHF) or a
 * string (FormData); an empty value fails as "required" rather than coercing to
 * a misleading 0.
 */
function requiredNumber(opts: {
  min: number;
  max: number;
  label: string;
}): z.ZodType<number> {
  const { min, max, label } = opts;
  return z.preprocess(
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
        required_error: `Enter ${label}`,
        invalid_type_error: `Enter ${label}`,
      })
      .int(`${label} must be a whole number`)
      .min(min, `${label} looks too low`)
      .max(max, `${label} looks too high`),
  ) as z.ZodType<number>;
}

/**
 * An OPTIONAL detail count. The whole point of this file: empty (unset stepper,
 * blank string, missing FormData key) becomes `null` — "not recorded" — and is
 * kept distinct from an entered `0`. A real `0` (e.g. zero penalties, a genuinely
 * clean round) passes straight through.
 */
function optionalCount(label: string): z.ZodType<number | null> {
  return z.preprocess(
    (v) => {
      if (v === null || v === undefined) return null;
      if (typeof v === "string") {
        const trimmed = v.trim();
        return trimmed === "" ? null : Number(trimmed);
      }
      return v;
    },
    z
      .number({ invalid_type_error: `${label} must be a whole number` })
      .int(`${label} must be a whole number`)
      .min(0, `${label} can't be negative`)
      .max(COUNT_MAX, `${label} looks too high`)
      .nullable(),
  ) as z.ZodType<number | null>;
}

/** `YYYY-MM-DD` calendar day, real and not in the future (a round is played, then logged). */
const playedOn = z
  .string()
  .trim()
  .min(1, "Enter the date you played")
  .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), "Enter a valid date")
  .refine((v) => {
    const t = Date.parse(`${v}T12:00:00Z`);
    return !Number.isNaN(t);
  }, "Enter a valid date")
  .refine((v) => {
    // Compare calendar days in UTC — a round is a day, not an instant.
    const today = new Date().toISOString().slice(0, 10);
    return v <= today;
  }, "That date is in the future");

const course = z
  .string()
  .trim()
  .min(1, "Enter the course")
  .max(120, "Keep the course name under 120 characters");

const holes = z.preprocess(
  (v) => (typeof v === "string" ? Number(v) : v),
  z
    .number({ required_error: "Choose 9 or 18 holes" })
    .refine((v): v is Holes => v === 9 || v === 18, "Choose 9 or 18 holes"),
) as z.ZodType<Holes>;

const notes = z.preprocess((v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    const trimmed = v.trim();
    return trimmed === "" ? null : trimmed;
  }
  return v;
}, z.string().max(2000, "Keep notes under 2000 characters").nullable()) as z.ZodType<
  string | null
>;

// --------------------------------------------------------------------------
// The schema
// --------------------------------------------------------------------------

export const roundSchema = z
  .object({
    played_on: playedOn,
    course,
    round_type: z.enum(ROUND_TYPES, {
      required_error: "Choose a round type",
      invalid_type_error: "Choose a round type",
    }),
    holes,
    par: requiredNumber({ min: 27, max: 100, label: "par" }),
    score: requiredNumber({ min: 18, max: 200, label: "your score" }),
    penalty_strokes: optionalCount("Penalty strokes"),
    three_putts: optionalCount("Three-putts"),
    total_putts: optionalCount("Total putts"),
    fairways_hit: optionalCount("Fairways hit"),
    fairways_possible: optionalCount("Fairways possible"),
    greens_in_regulation: optionalCount("Greens in regulation"),
    up_and_downs: optionalCount("Up and downs"),
    doubles_or_worse: optionalCount("Doubles or worse"),
    notes,
  })
  .superRefine((data, ctx) => {
    // Fairways hit can't exceed the fairways available — only checked when the
    // athlete recorded both, so leaving them blank is never an error.
    if (
      data.fairways_hit !== null &&
      data.fairways_possible !== null &&
      data.fairways_hit > data.fairways_possible
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fairways_hit"],
        message: "Fairways hit can't be more than fairways possible",
      });
    }
  });

/** The validated, coerced round — what the server action inserts (minus athlete_id). */
export type RoundInput = z.output<typeof roundSchema>;

/**
 * The shape React Hook Form holds. Distinct from `RoundInput` on purpose: while
 * the athlete is still filling it in, required numbers can be `null` (an empty
 * input) and the resolver reports them as required on submit. Detail fields stay
 * `number | null` throughout, so the null-not-zero contract holds from keystroke
 * to database.
 */
export type RoundFormValues = {
  played_on: string;
  course: string;
  round_type: RoundType;
  holes: Holes;
  par: number | null;
  score: number | null;
  penalty_strokes: number | null;
  three_putts: number | null;
  total_putts: number | null;
  fairways_hit: number | null;
  fairways_possible: number | null;
  greens_in_regulation: number | null;
  up_and_downs: number | null;
  doubles_or_worse: number | null;
  notes: string | null;
};
