import { GAP_LIMIT_DAYS } from "@/lib/dashboard/present";
import { daysBetween } from "@/lib/stats/helpers";
import type { EventStatus } from "@/lib/schemas/event";

import { monthKey, monthLabel } from "./format";

/**
 * Pure presentation logic for the Tournament Plan — kept out of components so it
 * is unit-testable without a database or React (Session 9 carry-forward). It does
 * NOT own any headline number: gap days, longest gap, and the season fee total
 * come from the stats engine (`lib/stats`). What lives here is arrangement the
 * engine does not own — bucketing events into months, threading the inter-event
 * gap markers, and the plain status counts the season summary reports.
 */

/** The minimum an event needs to be arranged; the real rows carry much more. */
type SchedulableEvent = {
  id: string;
  plays_on: string;
  status: EventStatus;
};

/**
 * One rendered row in the schedule walk. A `month` starts a new month group; a
 * `gap` is the day-count bridge between two consecutive PLANNED events (styled as
 * a warning past the 60-day line); an `event` is a real event, flagged `isNext`
 * when it is the soonest one still ahead.
 */
export type ScheduleItem<T> =
  | { kind: "month"; key: string; label: string }
  | { kind: "gap"; days: number; exceedsLimit: boolean }
  | { kind: "event"; event: T; isNext: boolean };

/**
 * The soonest planned (non-`skipped`) event on or after `todayIso`, by id — the
 * one the list flags "Next up". Mirrors the dashboard's `nextEvent` selection so
 * the two screens agree on what "next" means. `null` when nothing is ahead.
 */
function nextEventId(
  events: SchedulableEvent[],
  todayIso: string,
): string | null {
  return (
    [...events]
      .filter((e) => e.status !== "skipped" && e.plays_on >= todayIso)
      .sort((a, b) => a.plays_on.localeCompare(b.plays_on))[0]?.id ?? null
  );
}

/**
 * Arrange events into the flat, ordered list the schedule renders: month headings
 * where the month turns over, gap markers between consecutive planned events, and
 * the events themselves. Skipped events still render (so a deliberately-dropped
 * event is visible, not silently gone) but take no gap marker and don't advance
 * the gap cursor — exactly the engine's rule that `skipped` is out of the plan
 * (see `lib/stats/events`), so the gap a reader sees equals `gapDays(...)`.
 *
 * Generic over the event shape so it runs on the full joined rows in the client
 * list and on plain fixtures in tests.
 */
export function buildScheduleList<T extends SchedulableEvent>(
  events: T[],
  todayIso: string,
): ScheduleItem<T>[] {
  const ordered = [...events].sort((a, b) =>
    a.plays_on.localeCompare(b.plays_on),
  );
  const nextId = nextEventId(ordered, todayIso);

  const items: ScheduleItem<T>[] = [];
  let currentMonth: string | null = null;
  let prevPlannedDate: string | null = null;

  for (const event of ordered) {
    const mk = monthKey(event.plays_on);
    if (mk !== currentMonth) {
      items.push({ kind: "month", key: mk, label: monthLabel(mk) });
      currentMonth = mk;
    }

    if (event.status === "skipped") {
      // Rendered, but off the plan: no gap marker, and the gap cursor doesn't move.
      items.push({ kind: "event", event, isNext: false });
      continue;
    }

    if (prevPlannedDate !== null) {
      const days = daysBetween(prevPlannedDate, event.plays_on);
      items.push({ kind: "gap", days, exceedsLimit: days > GAP_LIMIT_DAYS });
    }
    items.push({ kind: "event", event, isNext: event.id === nextId });
    prevPlannedDate = event.plays_on;
  }

  return items;
}

/** The plain counts the season summary reports. `planned` is every non-`skipped`
 * event (the plan); `played` is the completed subset; `upcoming` is planned but
 * not yet played; `skipped` is removed-from-plan. Simple counts, no engine math. */
export interface StatusCounts {
  total: number;
  planned: number;
  played: number;
  upcoming: number;
  skipped: number;
}

export function statusCounts(events: SchedulableEvent[]): StatusCounts {
  let played = 0;
  let skipped = 0;
  let upcoming = 0;
  for (const e of events) {
    if (e.status === "skipped") skipped++;
    else if (e.status === "played") played++;
    else upcoming++;
  }
  return {
    total: events.length,
    planned: events.length - skipped,
    played,
    upcoming,
    skipped,
  };
}
