import { daysBetween } from "./helpers";
import type { EventRow } from "./types";

/**
 * Metrics over the Schedule (the Tournament Plan tab).
 *
 * "Planned" = every event except `skipped`. A skipped event was removed from
 * the plan, so it is not a real gap-filler and its fee is not owed — it drops
 * out of every calculation here. `not_registered`, `registered`, and `played`
 * events all count: an event the athlete intends to play still occupies its slot
 * on the calendar whether or not registration is complete yet.
 *
 * These functions compute over exactly the events passed in — the caller chooses
 * the window (a season, the whole schedule). The 60-day warning threshold lives
 * in the UI (Session 9/10); these functions just return the numbers.
 */

function plannedEventsByDate(events: EventRow[]): EventRow[] {
  return events
    .filter((e) => e.status !== "skipped")
    .sort((a, b) => a.plays_on.localeCompare(b.plays_on));
}

/**
 * Days between each pair of consecutive planned events, in chronological order.
 * `gapDays(...)[0]` is the gap from the first planned event to the second.
 * Returns `[]` when there are fewer than two planned events (no gap exists).
 */
export function gapDays(events: EventRow[]): number[] {
  const planned = plannedEventsByDate(events);
  const gaps: number[] = [];
  for (let i = 1; i < planned.length; i++) {
    const previous = planned[i - 1];
    const current = planned[i];
    // Bounds-guaranteed by the loop range, but the guard satisfies
    // noUncheckedIndexedAccess without a non-null assertion.
    if (previous && current) {
      gaps.push(daysBetween(previous.plays_on, current.plays_on));
    }
  }
  return gaps;
}

/**
 * The longest gap, in days, between two consecutive planned events. Returns
 * `null` when fewer than two planned events exist — with nothing to span, there
 * is no gap, and that is "not applicable", not 0.
 */
export function longestGap(events: EventRow[]): number | null {
  const gaps = gapDays(events);
  if (gaps.length === 0) return null;
  return Math.max(...gaps);
}

/**
 * Total entry fees, in integer cents, across planned events. Excludes `skipped`
 * events. A null fee is treated as 0 (unknown/free), never as a reason to drop
 * the event. Returns 0 for no planned events — a sum over nothing is genuinely
 * zero, unlike an average.
 */
export function seasonFeeTotal(events: EventRow[]): number {
  return plannedEventsByDate(events).reduce(
    (total, e) => total + (e.entry_fee_cents ?? 0),
    0,
  );
}
