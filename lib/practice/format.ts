/**
 * Presentation helpers for the Practice Log that format RAW values — a minute
 * count, a share of a mix. They are NOT derived metrics: the minutes-by-type
 * totals and the mix fractions come from the stats engine (`minutesByType`,
 * `practiceRatio`) and are only rendered here (Session 8/9/10 carry-forward).
 * The calendar-day formatters are reused as-is from `lib/rounds/format` and
 * `lib/schedule/format`.
 */

/**
 * A minute count as a reading duration: "45m", "1h", "1h 30m", "10h". Zero is a
 * real answer ("0m") — a type with no logged time reports zero, it is not missing
 * data — so this never returns an em dash.
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/**
 * A 0..1 share as a whole percent, e.g. 0.423 → "42%". Rounded for reading, so
 * a set of shares can add to 99% or 101%; every number the ratio check states in
 * prose is passed through this same function, so what the athlete reads in the
 * sentence always matches what they read on the bar.
 */
export function formatShare(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/** A target band as a range, e.g. "55–70%" (en dash, not a hyphen). */
export function formatShareRange(min: number, max: number): string {
  return `${Math.round(min * 100)}–${Math.round(max * 100)}%`;
}
