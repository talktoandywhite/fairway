import { z } from "zod";

import type { Database } from "@/types/database";

/**
 * The event (Tournament Plan) schema — shared verbatim by the client form (React
 * Hook Form) and the server actions (CLAUDE.md: "Zod schemas are shared between
 * client validation and server actions"). The server re-parses with this on every
 * mutation; the client copy is a UX layer, never the security boundary, and RLS is
 * the real one underneath.
 *
 * Two things this file guards that matter downstream:
 *   - Money is integer CENTS. The athlete types a fee in dollars; `feeCents`
 *     converts to an integer count of cents and never lets a float reach the
 *     database (CLAUDE.md, "Money in integer cents. Never floats").
 *   - `plays_on` is a calendar day and is NOT restricted to the past. Unlike a
 *     round (played, then logged), an event is usually in the FUTURE — the whole
 *     point of a plan. Any real date is allowed.
 */

// --------------------------------------------------------------------------
// event_status — kept in lockstep with the Postgres enum via a compile-time guard
// --------------------------------------------------------------------------

export const EVENT_STATUSES = [
  "not_registered",
  "registered",
  "played",
  "skipped",
] as const satisfies readonly Database["public"]["Enums"]["event_status"][];

export type EventStatus = (typeof EVENT_STATUSES)[number];

// Fails compilation if the DB enum and this list ever drift apart.
type _MissingStatus = Exclude<
  Database["public"]["Enums"]["event_status"],
  EventStatus
>;
type _StatusesAreExhaustive = _MissingStatus extends never
  ? true
  : ["event_status missing from EVENT_STATUSES:", _MissingStatus];
const _statusesAreExhaustive: _StatusesAreExhaustive = true;
void _statusesAreExhaustive;

/** Human labels for the status selector and the badges. */
export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  not_registered: "Not registered",
  registered: "Registered",
  played: "Played",
  skipped: "Skipped",
};

/**
 * The forward status path a single click advances through:
 * `not_registered → registered → played`. `skipped` is off this path — it is a
 * deliberate "removed from the plan" choice made from the edit form or the status
 * menu, never the next step of the happy path. `null` means "already at the end".
 */
export function nextStatus(status: EventStatus): EventStatus | null {
  switch (status) {
    case "not_registered":
      return "registered";
    case "registered":
      return "played";
    default:
      return null;
  }
}

// --------------------------------------------------------------------------
// event_priority — likewise guarded against enum drift
// --------------------------------------------------------------------------

export const EVENT_PRIORITIES = [
  "priority",
  "optional",
  "stretch",
  "backup",
  "low",
] as const satisfies readonly Database["public"]["Enums"]["event_priority"][];

export type EventPriority = (typeof EVENT_PRIORITIES)[number];

type _MissingPriority = Exclude<
  Database["public"]["Enums"]["event_priority"],
  EventPriority
>;
type _PrioritiesAreExhaustive = _MissingPriority extends never
  ? true
  : ["event_priority missing from EVENT_PRIORITIES:", _MissingPriority];
const _prioritiesAreExhaustive: _PrioritiesAreExhaustive = true;
void _prioritiesAreExhaustive;

/** Human labels for the priority selector and the badges. */
export const EVENT_PRIORITY_LABELS: Record<EventPriority, string> = {
  priority: "Priority",
  optional: "Optional",
  stretch: "Stretch",
  backup: "Backup",
  low: "Low",
};

// --------------------------------------------------------------------------
// Holes — the DB check constraint allows only 9 or 18
// --------------------------------------------------------------------------

export const HOLE_OPTIONS = [9, 18] as const;
export type Holes = (typeof HOLE_OPTIONS)[number];

// --------------------------------------------------------------------------
// Field-level pieces
// --------------------------------------------------------------------------

/** A `YYYY-MM-DD` calendar day. Any real date — past events (played) and future
 * events (the plan) are both valid, so there is no future/past bound here. */
const playsOn = z
  .string()
  .trim()
  .min(1, "Enter the date")
  .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), "Enter a valid date")
  .refine((v) => {
    const t = Date.parse(`${v}T12:00:00Z`);
    return !Number.isNaN(t);
  }, "Enter a valid date");

const name = z
  .string()
  .trim()
  .min(1, "Enter the event name")
  .max(120, "Keep the event name under 120 characters");

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

/** Optional tour reference: a uuid from the catalog, or `null` for "no tour". */
const tourId = z.preprocess((v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    const trimmed = v.trim();
    return trimmed === "" ? null : trimmed;
  }
  return v;
}, z.string().uuid("Choose a tour from the list").nullable()) as z.ZodType<
  string | null
>;

const holes = z.preprocess(
  (v) => (typeof v === "string" ? Number(v) : v),
  z
    .number({ required_error: "Choose 9 or 18 holes" })
    .refine((v): v is Holes => v === 9 || v === 18, "Choose 9 or 18 holes"),
) as z.ZodType<Holes>;

/**
 * The entry fee, entered by the athlete in DOLLARS and stored as integer CENTS.
 * Blank means "not set" → `null` (an unknown fee is not a free event). A real 0
 * ("Free") passes through as 0 cents. Accepts "85", "85.00", "$85", "1,234.50".
 * Rounds to the nearest cent so a stray third decimal can never write a fraction
 * of a cent.
 *
 * The FORM field is `entry_fee` (a dollars string); the schema transforms it to
 * the `entry_fee_cents` integer the `events` column stores (see the object
 * transform below). This keeps the shared schema validating the exact field the
 * form holds while still emitting the cents the database wants.
 */
const feeDollars = z.preprocess(
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
    .number({ invalid_type_error: "Enter the fee as a number, e.g. 85" })
    .int()
    .min(0, "A fee can't be negative")
    .max(10_000_000, "That fee looks too high")
    .nullable(),
) as z.ZodType<number | null>;

// --------------------------------------------------------------------------
// The schema
// --------------------------------------------------------------------------

/**
 * Input shape validated on both client and server. The fee comes in as `entry_fee`
 * (dollars); the `.transform` below renames it to `entry_fee_cents` so the parsed
 * output matches the `events` table exactly and can be spread straight into an
 * insert/update.
 */
export const eventSchema = z
  .object({
    name,
    plays_on: playsOn,
    tour_id: tourId,
    course: optionalText(120, "the course name"),
    city: optionalText(120, "the city"),
    holes,
    entry_fee: feeDollars,
    priority: z.enum(EVENT_PRIORITIES, {
      required_error: "Choose a priority",
      invalid_type_error: "Choose a priority",
    }),
    status: z.enum(EVENT_STATUSES, {
      required_error: "Choose a status",
      invalid_type_error: "Choose a status",
    }),
    notes: optionalText(2000, "notes"),
  })
  .transform(({ entry_fee, ...rest }) => ({
    ...rest,
    entry_fee_cents: entry_fee,
  }));

/** The validated, coerced event — what a server action inserts (minus athlete_id). */
export type EventInput = z.output<typeof eventSchema>;

/**
 * The shape React Hook Form holds. Distinct from `EventInput`: while the athlete
 * is still filling it in, the fee lives as the raw dollars STRING the input holds
 * (empty = not set), and only becomes integer cents on parse. Keeping the form
 * type honest about that avoids a class of "0 vs blank vs $0.00" bugs.
 */
export type EventFormValues = {
  name: string;
  plays_on: string;
  tour_id: string | null;
  course: string | null;
  city: string | null;
  holes: Holes;
  /** Dollars, as typed. "" means "not set" (→ null cents on submit). Named to
   * match the schema's input key so the shared resolver reports errors on it. */
  entry_fee: string;
  priority: EventPriority;
  status: EventStatus;
  notes: string | null;
};
