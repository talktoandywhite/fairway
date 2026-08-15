import { SESSION_TYPES } from "./types";
import type { PracticeSegmentRow, SessionTypeTotals } from "./types";

/**
 * Metrics over the Practice Log.
 *
 * These count SEGMENTS, not sessions. A session is a day's block and routinely
 * covers several disciplines — exercise, then swing work, then putting — and the
 * minutes for each live on that discipline's segment (migration 0010). Counting
 * sessions would mean dividing a block total between disciplines, and a divided
 * total is a number the athlete never entered.
 *
 * Session 7's job stops at the computed mix. Judging that mix against a healthy
 * ratio for the athlete's level — the workbook's "a 113 shooter practicing
 * mostly full swing has it backwards" insight — is Session 11. These functions
 * return the numbers; they render no verdict.
 */

function emptyTotals(): SessionTypeTotals {
  return SESSION_TYPES.reduce((acc, type) => {
    acc[type] = 0;
    return acc;
  }, {} as SessionTypeTotals);
}

/**
 * Total minutes grouped by `session_type`. Every session type is present as a
 * key — types with no logged time report 0 — so charts and the ratio check
 * never have to reason about missing keys.
 */
export function minutesByType(
  segments: PracticeSegmentRow[],
): SessionTypeTotals {
  const totals = emptyTotals();
  for (const segment of segments) {
    totals[segment.session_type] += segment.minutes;
  }
  return totals;
}

/**
 * The practice mix as fractions of total minutes, keyed by `session_type` (each
 * value in 0..1, summing to 1). Returns `null` when no minutes are logged — a
 * ratio over zero minutes is undefined, not a record of zeros.
 */
export function practiceRatio(
  segments: PracticeSegmentRow[],
): SessionTypeTotals | null {
  const totals = minutesByType(segments);
  const totalMinutes = SESSION_TYPES.reduce(
    (sum, type) => sum + totals[type],
    0,
  );
  if (totalMinutes === 0) return null;

  const ratio = emptyTotals();
  for (const type of SESSION_TYPES) {
    ratio[type] = totals[type] / totalMinutes;
  }
  return ratio;
}
