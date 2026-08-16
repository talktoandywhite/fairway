/**
 * Presentation helpers for the Lesson Log that format RAW row fields — a stored
 * cost in integer cents, a coach's name. They are NOT derived metrics: the lesson
 * spend and the outstanding-homework selection come from the stats engine
 * (`lessonSpendCents`, `outstandingHomework`), and the wording of the homework
 * prompt is in `present.ts`. The calendar-day formatters are reused as-is from
 * `lib/rounds/format` and `lib/schedule/format`.
 */

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format a lesson cost stored as integer cents.
 *   - `null` → "Not recorded" (unknown, distinct from free).
 *   - `0`    → "No charge" (a recorded zero — a school session, or a coach who
 *              didn't charge).
 *   - `>0`   → "$90.00", "$1,234.00".
 * Money is integer cents end to end; this is the one place a lesson cost becomes
 * dollars, and only for display (CLAUDE.md, "Money in integer cents. Never floats").
 */
export function formatCostCents(cents: number | null): string {
  if (cents === null) return "Not recorded";
  if (cents === 0) return "No charge";
  return usd.format(cents / 100);
}

/** A cents total as plain dollars, e.g. "$270.00". Used for the log's spend
 * summary, where "Not recorded" and "No charge" are not the question being
 * asked — a total is always a number. */
export function formatCentsTotal(cents: number): string {
  return usd.format(cents / 100);
}

/** A whole-dollar string for prefilling the cost input in edit mode. "" when the
 * cost is unset. Trailing ".00" is dropped so "$90.00" edits back as "90". */
export function costCentsToDollarsInput(cents: number | null): string {
  if (cents === null) return "";
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? String(dollars) : dollars.toFixed(2);
}

/** How a lesson is titled where it stands alone — the detail heading, the delete
 * confirmation, the edit subtitle. A coach name is optional on the table, so this
 * never renders an empty heading. */
export function lessonTitle(coachName: string | null): string {
  const name = coachName?.trim();
  return name ? `Lesson with ${name}` : "Lesson";
}

/**
 * How a lesson is titled INSIDE the log, where the surrounding page has already
 * said these are lessons: the coach's name alone.
 *
 * This is not a style preference. At 375px the row title truncates, and
 * "Lesson with Coach Diaz" truncates to "Lesson with C…" — spending the whole
 * line on the word every row shares and cutting the only part that differs.
 * Measured on the seeded log before it was changed.
 */
export function lessonListTitle(coachName: string | null): string {
  return coachName?.trim() || "Lesson";
}
