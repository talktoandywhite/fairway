import type { RoundRow } from "./types";

/**
 * Shared internals for the stats engine. Kept in one place so the rounding
 * convention and the "what counts as a qualifying round" rule are defined once
 * and every headline metric agrees.
 */

/**
 * Round to two decimal places. Scoring averages are presented to two decimals
 * by golf convention, and the reference workbook's displayed numbers
 * (107.25, 101.67) are two-decimal values — so the averaging functions round
 * here rather than leaving a caller to reproduce it. The `EPSILON` nudge avoids
 * the classic float artifact (e.g. 1.005 → 1.00). Ratios and the trendline fit
 * are intentionally NOT routed through this — they stay full precision.
 */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Arithmetic mean of a non-empty list. Callers guard the empty case. */
export function mean(values: number[]): number {
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

/**
 * Whole calendar days from `a` to `b`, both `YYYY-MM-DD` strings. Parsed at UTC
 * midnight so the result is an exact integer free of timezone/DST drift — the
 * whole reason round and event dates are stored as `date`, not `timestamptz`
 * (CLAUDE.md, database conventions).
 */
export function daysBetween(a: string, b: string): number {
  const MS_PER_DAY = 86_400_000;
  const start = Date.parse(`${a}T00:00:00Z`);
  const end = Date.parse(`${b}T00:00:00Z`);
  return Math.round((end - start) / MS_PER_DAY);
}

/**
 * The scoring-average population: 18-hole `tournament` rounds only. This single
 * predicate defines the headline set — scoring average, last-N, best round,
 * per-round leak averages, and the trend line all draw from it, so a
 * practice/simulated/nine-hole round can never leak into a headline number.
 */
export function isQualifyingRound(round: RoundRow): boolean {
  return round.round_type === "tournament" && round.holes === 18;
}

/** The 18-hole tournament rounds, in the order given. */
export function qualifyingRounds(rounds: RoundRow[]): RoundRow[] {
  return rounds.filter(isQualifyingRound);
}
