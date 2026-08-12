/**
 * Small presentation helpers for rounds, shared by the list and detail views so
 * a date or a to-par reads identically everywhere. These format raw row fields
 * (a stored date, a score, a par) — they are NOT derived metrics. Every derived
 * number (scoring average, per-round leak averages, trend) comes from the stats
 * engine in `lib/stats`, never recomputed in a component (Session 8 carry-forward).
 */

/**
 * Format a stored `YYYY-MM-DD` calendar day as e.g. "May 2, 2026". Parsed at UTC
 * noon and formatted in UTC so the day never shifts across a timezone — a round
 * is played on a day, not at an instant (CLAUDE.md).
 */
export function formatPlayedOn(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Score relative to par: "E" at par, "+8" over, "-1" under. */
export function toParLabel(score: number, par: number): string {
  const delta = score - par;
  if (delta === 0) return "E";
  return delta > 0 ? `+${delta}` : `${delta}`;
}
