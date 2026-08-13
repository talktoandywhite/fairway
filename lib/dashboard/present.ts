import type { EventRow, RoundAverageField, Trendline } from "@/lib/stats";
import type { Database } from "@/types/database";

type PhaseRow = Database["public"]["Tables"]["phases"]["Row"];

/**
 * Presentation logic for the dashboard — pure functions that turn engine
 * output and raw rows into what a widget renders. They deliberately do NOT
 * compute any headline metric: scoring average, per-round leak averages,
 * trend, and gaps all come from `lib/stats` and are passed in. What lives here
 * is orientation the engine does not own — which leak maps to which measured
 * field, which phase is "today's", how a trend slope reads in words, how far
 * off a leak still is. Kept pure and separate so it is unit-testable without a
 * database and without React.
 */

/**
 * The workbook's rule: a plan should never leave more than 60 days between
 * consecutive events. Above this the dashboard raises a (non-shaming) warning.
 */
export const GAP_LIMIT_DAYS = 60;

/** Today as a `YYYY-MM-DD` calendar day, in UTC — the basis every date widget
 * measures against. Golf happens on a day, not an instant (CLAUDE.md), and the
 * stored dates are UTC calendar days, so "today" is taken the same way. */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Whole calendar days from `fromIso` to `targetIso`, both `YYYY-MM-DD`. Positive
 * means the target is in the future. Parsed at UTC midnight so the result is an
 * exact integer, matching `lib/stats` date math (see helpers.daysBetween) — the
 * dashboard's countdowns and "days remaining" agree with the engine's gaps.
 */
export function daysUntil(fromIso: string, targetIso: string): number {
  const MS_PER_DAY = 86_400_000;
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const target = Date.parse(`${targetIso}T00:00:00Z`);
  return Math.round((target - from) / MS_PER_DAY);
}

/**
 * Map a leak to the round detail field that measures it, or `null` when no
 * per-round column tracks it.
 *
 * This mapping is deliberately explicit and conservative. Only two of the
 * reference athlete's leaks have a direct, honestly-measured column —
 * penalties and three-putts. "Chunked chips" and "hero shots" have no
 * dedicated field on `rounds`, and forcing them onto a loose proxy
 * (up-and-downs, doubles) would report a number that is not what it claims to
 * be. Those leaks fall back to the athlete's self-reported range instead of a
 * fabricated live average. Matching is by keyword so it survives light edits to
 * a leak's wording in the Session 14 editor.
 */
export function resolveLeakField(leakName: string): RoundAverageField | null {
  const name = leakName.toLowerCase();
  if (name.includes("penalt")) return "penalty_strokes";
  if (/three[\s-]?putt|3[\s-]?putt/.test(name)) return "three_putts";
  return null;
}

export type TrendDirection = "improving" | "regressing" | "steady";

export interface TrendDescription {
  direction: TrendDirection;
  /** Signed strokes per 30 days — negative is improving. A presentation unit
   * derived from the engine's slope (strokes/day), never a re-derived metric. */
  strokesPerMonth: number;
}

/**
 * Read the trend line's slope as a direction and a monthly magnitude. `null`
 * in (fewer than two qualifying rounds, or all on one day) stays `null` out —
 * the widget shows its empty state rather than an arrow pointing nowhere.
 *
 * A slope under half a stroke a month reads as "holding steady": below that the
 * fit is noise, not a story, and calling a flat season "improving" would be a
 * lie the athlete can feel.
 */
export function describeTrend(fit: Trendline | null): TrendDescription | null {
  if (!fit) return null;
  const strokesPerMonth = Math.round(fit.slope * 30 * 10) / 10;
  if (Math.abs(strokesPerMonth) < 0.5) {
    return { direction: "steady", strokesPerMonth };
  }
  return {
    direction: fit.slope < 0 ? "improving" : "regressing",
    strokesPerMonth,
  };
}

/**
 * The phase containing `todayIso` (inclusive of both ends), or `null` when
 * today falls outside every phase — between blocks, or after the season plan
 * has ended. The seed's plan runs fall 2025 → spring 2026, so a "today" past
 * it legitimately has no current phase, and the widget says so honestly.
 */
export function currentPhase(
  phases: PhaseRow[],
  todayIso: string,
): PhaseRow | null {
  return (
    phases.find((p) => p.starts_on <= todayIso && todayIso <= p.ends_on) ?? null
  );
}

/**
 * The earliest phase that starts after `todayIso`, or `null` if none is ahead.
 * Used only to give the "no current phase" empty state something forward-looking
 * to point at when the athlete is between blocks.
 */
export function upcomingPhase(
  phases: PhaseRow[],
  todayIso: string,
): PhaseRow | null {
  return (
    [...phases]
      .filter((p) => p.starts_on > todayIso)
      .sort((a, b) => a.starts_on.localeCompare(b.starts_on))[0] ?? null
  );
}

/**
 * The next event the athlete intends to play — soonest `plays_on` on or after
 * `todayIso`, excluding `skipped` events (a skipped event was removed from the
 * plan). `null` when nothing is scheduled ahead, which is a real state the
 * widget handles with an empty prompt rather than a broken countdown.
 */
export function nextEvent(
  events: EventRow[],
  todayIso: string,
): EventRow | null {
  return (
    [...events]
      .filter((e) => e.status !== "skipped" && e.plays_on >= todayIso)
      .sort((a, b) => a.plays_on.localeCompare(b.plays_on))[0] ?? null
  );
}

/**
 * How far a leak has been closed, as a fraction in [0, 1], from its starting
 * high toward its target. 1 means at or past target; 0 means no progress (or a
 * regression). Used to fill a progress track, so it is always clamped and never
 * divides by zero when high already equals target.
 */
export function leakProgress(
  high: number,
  target: number,
  current: number,
): number {
  if (high <= target) return current <= target ? 1 : 0;
  const closed = (high - current) / (high - target);
  return Math.min(1, Math.max(0, closed));
}
