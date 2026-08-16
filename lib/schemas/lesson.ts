import { z } from "zod";

import type { Database } from "@/types/database";

/**
 * The lesson (Lesson Log) schema — shared verbatim by the client form (React
 * Hook Form) and the server actions (CLAUDE.md: "Zod schemas are shared between
 * client validation and server actions"). The server re-parses with this on every
 * mutation; the client copy is a UX layer, never the security boundary, and RLS is
 * the real one underneath.
 *
 * Three things this file guards:
 *   - **Money is integer CENTS.** The athlete types a cost in dollars; `costDollars`
 *     converts to an integer count of cents and never lets a float reach the
 *     database (CLAUDE.md, "Money in integer cents. Never floats"). Blank is `null`
 *     ("not recorded"), which is a different fact from a recorded `0`.
 *   - **`occurred_on` is a past calendar day.** A lesson happens, then gets logged.
 *     Unlike an event — which is usually in the future by design — a future-dated
 *     lesson is a typo.
 *   - **`homework_done` is genuinely nullable.** "Not answered yet" is not "no".
 *     The dashboard's outstanding-homework card leans on that distinction, and
 *     collapsing the two would turn an unanswered question into a failure.
 *
 * Everything except the date is optional, matching the table. A lesson logged in
 * the car park with a coach's name and a swing key is worth more than a perfect
 * record that never gets written down; the detail can be filled in later from the
 * edit form.
 */

// --------------------------------------------------------------------------
// homework_status — kept in lockstep with the Postgres enum via a compile-time guard
// --------------------------------------------------------------------------

export const HOMEWORK_STATUSES = [
  "yes",
  "partly",
  "no",
] as const satisfies readonly Database["public"]["Enums"]["homework_status"][];

export type HomeworkStatus = (typeof HOMEWORK_STATUSES)[number];

// Fails compilation if the DB enum and this list ever drift apart.
type _MissingHomeworkStatus = Exclude<
  Database["public"]["Enums"]["homework_status"],
  HomeworkStatus
>;
type _HomeworkStatusesAreExhaustive = _MissingHomeworkStatus extends never
  ? true
  : ["homework_status missing from HOMEWORK_STATUSES:", _MissingHomeworkStatus];
const _homeworkStatusesAreExhaustive: _HomeworkStatusesAreExhaustive = true;
void _homeworkStatusesAreExhaustive;

/**
 * Human labels for the status selector and the badges.
 *
 * `no` reads "Not yet", not "No". The stored value is a fact about the work, but
 * the word the athlete sees is a fact about the work *so far* — and homework that
 * hasn't happened is a thing to go do, not a thing to be marked down for
 * (CLAUDE.md: "Encouraging, never nagging"). The database is unchanged; only the
 * word is kinder.
 */
export const HOMEWORK_STATUS_LABELS: Record<HomeworkStatus, string> = {
  yes: "Done",
  partly: "Partly done",
  no: "Not yet",
};

/** The label for "the athlete hasn't answered", which is a real and separate
 * state from all three enum values. */
export const HOMEWORK_UNANSWERED_LABEL = "Not answered";

// --------------------------------------------------------------------------
// Field-level pieces
// --------------------------------------------------------------------------

/** `YYYY-MM-DD` calendar day, real and not in the future — a lesson is taken,
 * then logged. Compared as UTC calendar days, matching how the dates are stored. */
const occurredOn = z
  .string()
  .trim()
  .min(1, "Enter the date of the lesson")
  .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), "Enter a valid date")
  .refine((v) => {
    const t = Date.parse(`${v}T12:00:00Z`);
    return !Number.isNaN(t);
  }, "Enter a valid date")
  .refine((v) => {
    const today = new Date().toISOString().slice(0, 10);
    return v <= today;
  }, "That date is in the future");

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

/**
 * Whether the homework got done. Blank → `null`, which the column allows and the
 * dashboard reads as "not answered yet" rather than "not done" — the athlete
 * hasn't been asked yet, and answering for them would put a fact in the record
 * they never stated.
 */
const homeworkDone = z.preprocess(
  (v) => {
    if (v === null || v === undefined) return null;
    if (typeof v === "string") {
      const trimmed = v.trim();
      return trimmed === "" ? null : trimmed;
    }
    return v;
  },
  z
    .enum(HOMEWORK_STATUSES, {
      invalid_type_error: "Choose whether the homework got done",
    })
    .nullable(),
) as z.ZodType<HomeworkStatus | null>;

/**
 * The lesson cost, entered in DOLLARS and stored as integer CENTS. Blank means
 * "not recorded" → `null`; a real 0 passes through as 0 cents (a school-program
 * lesson, or one a coach didn't charge for). Accepts "90", "90.00", "$90",
 * "1,234.50". Rounds to the nearest cent so a stray third decimal can never write
 * a fraction of a cent.
 *
 * This mirrors `entry_fee` on the event schema deliberately — money is entered
 * the same way everywhere in the app, and both convert at the schema boundary so
 * no float ever reaches Postgres.
 */
const costDollars = z.preprocess(
  (v) => {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return Math.round(v * 100);
    if (typeof v === "string") {
      const trimmed = v.trim().replace(/[$,]/g, "");
      if (trimmed === "") return null;
      const dollars = Number(trimmed);
      if (Number.isNaN(dollars)) return NaN; // let the number check report it
      return Math.round(dollars * 100);
    }
    return v;
  },
  z
    .number({ invalid_type_error: "Enter the cost as a number, e.g. 90" })
    .int()
    .min(0, "A cost can't be negative")
    .max(10_000_000, "That cost looks too high")
    .nullable(),
) as z.ZodType<number | null>;

// --------------------------------------------------------------------------
// The schema
// --------------------------------------------------------------------------

/**
 * Input shape validated on both client and server. The cost comes in as `cost`
 * (dollars); the `.transform` below renames it to `cost_cents` so the parsed
 * output matches the `lessons` table exactly and can be spread straight into an
 * insert or update.
 */
export const lessonSchema = z
  .object({
    occurred_on: occurredOn,
    coach_name: optionalText(120, "the coach's name"),
    swing_key: optionalText(200, "the swing key"),
    drill_assigned: optionalText(300, "the drill"),
    homework_target: optionalText(200, "the homework target"),
    homework_done: homeworkDone,
    cost: costDollars,
    what_changed: optionalText(2000, "what changed"),
  })
  .transform(({ cost, ...rest }) => ({ ...rest, cost_cents: cost }));

/** The validated, coerced lesson — what a server action writes (minus athlete_id). */
export type LessonInput = z.output<typeof lessonSchema>;

/**
 * The shape React Hook Form holds. Distinct from `LessonInput` in two places:
 * while the athlete is still filling it in the cost lives as the raw dollars
 * STRING its input holds (empty = not recorded), and `homework_done` lives as the
 * select's string value ("" = not answered). Keeping the form type honest about
 * that avoids a class of "0 vs blank" and "no vs unanswered" bugs.
 */
export type LessonFormValues = {
  occurred_on: string;
  coach_name: string | null;
  swing_key: string | null;
  drill_assigned: string | null;
  homework_target: string | null;
  /** "" means not answered yet (→ null). Named to match the schema's input key
   * so the shared resolver reports errors on it. */
  homework_done: HomeworkStatus | "";
  /** Dollars, as typed. "" means "not recorded" (→ null cents on submit). */
  cost: string;
  what_changed: string | null;
};
