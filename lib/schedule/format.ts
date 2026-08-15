/**
 * Presentation helpers for the schedule that format RAW row fields — a stored
 * fee (integer cents), a stored month. They are NOT derived metrics: every
 * derived number (gap days, longest gap, season fee total, status counts) comes
 * from the stats engine in `lib/stats` or the pure helpers in `present.ts`, never
 * recomputed in a component (Session 8/9 carry-forward). The calendar-day date
 * formatter (`formatPlayedOn`) and the date math (`daysUntil`) are reused as-is
 * from `lib/rounds/format` and `lib/dashboard/present`.
 */

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format an entry fee stored as integer cents.
 *   - `null` → "Fee TBD" (unknown, distinct from free).
 *   - `0`    → "Free" (a recorded zero — e.g. a high-school event).
 *   - `>0`   → "$85.00", "$1,234.00".
 * Money is integer cents end to end; this is the one place it becomes dollars,
 * and only for display (CLAUDE.md, "Money in integer cents. Never floats").
 */
export function formatFeeCents(cents: number | null): string {
  if (cents === null) return "Fee TBD";
  if (cents === 0) return "Free";
  return usd.format(cents / 100);
}

/** A whole-dollar-string for prefilling the fee input in edit mode. "" when the
 * fee is unset. Trailing ".00" is dropped so "$85.00" edits back as "85". */
export function feeCentsToDollarsInput(cents: number | null): string {
  if (cents === null) return "";
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? String(dollars) : dollars.toFixed(2);
}

/** The `YYYY-MM` month key for a `YYYY-MM-DD` calendar day — the group key the
 * schedule buckets events into. Pure string slice; no Date, no timezone. */
export function monthKey(playsOnIso: string): string {
  return playsOnIso.slice(0, 7);
}

/** A `YYYY-MM` key as a reading label, e.g. "August 2025". Parsed at UTC noon so
 * the month never shifts across a timezone. */
export function monthLabel(key: string): string {
  const date = new Date(`${key}-01T12:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** A compact day label within a month group, e.g. "Aug 9". Full dates live in
 * the event detail view. */
export function formatDayShort(playsOnIso: string): string {
  const date = new Date(`${playsOnIso}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}
