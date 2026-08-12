import { daysBetween, mean, qualifyingRounds, round2 } from "./helpers";
import type { RoundAverageField, RoundRow, Trendline } from "./types";

/**
 * Metrics over the Score Log. Every function that produces a headline number
 * operates on the qualifying population — 18-hole `tournament` rounds — so
 * practice, simulated, and nine-hole rounds are excluded by construction. That
 * exclusion is the headline behavior of the whole engine, not an afterthought.
 */

/**
 * Scoring average — the headline number. Mean score over 18-hole `tournament`
 * rounds. Returns `null` when none qualify: the average of zero rounds is "not
 * recorded", never 0 (CLAUDE.md).
 */
export function scoringAverage(rounds: RoundRow[]): number | null {
  const qualifying = qualifyingRounds(rounds);
  if (qualifying.length === 0) return null;
  return round2(mean(qualifying.map((r) => r.score)));
}

/**
 * Mean score over the `n` most recent qualifying rounds, by played date. The
 * dashboard's "last 3" is `lastNAverage(rounds, 3)`. Returns `null` if fewer
 * than `n` rounds qualify — an average built on too small a sample is worse
 * than no number. `n < 1` is meaningless and also returns `null`.
 */
export function lastNAverage(rounds: RoundRow[], n: number): number | null {
  if (n < 1) return null;
  const qualifying = qualifyingRounds(rounds);
  if (qualifying.length < n) return null;
  const mostRecent = [...qualifying]
    .sort((a, b) => b.played_on.localeCompare(a.played_on))
    .slice(0, n);
  return round2(mean(mostRecent.map((r) => r.score)));
}

/**
 * The athlete's best (lowest) qualifying round. Uses the same 18-hole
 * tournament population as the scoring average, so a low practice or nine-hole
 * round is never reported as the "best round". Returns `null` when none qualify.
 */
export function bestRound(rounds: RoundRow[]): number | null {
  const qualifying = qualifyingRounds(rounds);
  if (qualifying.length === 0) return null;
  return Math.min(...qualifying.map((r) => r.score));
}

/**
 * Strokes to goal — scoring average minus the goal target. Negative means the
 * goal has been met. Returns `null` when the average is `null` (no qualifying
 * rounds): with no average there is no distance to a goal to report.
 */
export function strokesToGoal(
  average: number | null,
  target: number,
): number | null {
  if (average === null) return null;
  return round2(average - target);
}

/**
 * Average of a nullable detail field (penalties, three-putts, putts, …) over
 * the qualifying rounds — the per-round leak measurement the dashboard shows
 * against each leak's target.
 *
 * Nulls are skipped from BOTH numerator and denominator: a round where the
 * field was not recorded does not count as a zero and does not dilute the
 * average. Returns `null` when no qualifying round recorded the field.
 */
export function averagePerRound(
  rounds: RoundRow[],
  field: RoundAverageField,
): number | null {
  const recorded = qualifyingRounds(rounds)
    .map((r) => r[field])
    .filter((v): v is number => v !== null);
  if (recorded.length === 0) return null;
  return round2(mean(recorded));
}

/**
 * Least-squares fit of score against time over the qualifying rounds, for the
 * dashboard trend line.
 *
 * x basis is days since the first qualifying round (not round index), so the
 * fitted line overlays correctly on a date axis where tournaments are unevenly
 * spaced — a 90-day off-season gap should stretch the line, not compress to one
 * step. `slope` is strokes/day (negative = improving); `intercept` is the
 * fitted score at that first round.
 *
 * Returns `null` when fewer than two rounds qualify, or when every qualifying
 * round falls on the same date (no time span to fit a line across).
 */
export function trendline(rounds: RoundRow[]): Trendline | null {
  const qualifying = qualifyingRounds(rounds);
  if (qualifying.length < 2) return null;

  const firstDate = qualifying
    .map((r) => r.played_on)
    .reduce((min, d) => (d < min ? d : min));

  const points = qualifying.map((r) => ({
    x: daysBetween(firstDate, r.played_on),
    y: r.score,
  }));

  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (const { x, y } of points) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return null; // all rounds on the same day

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}
