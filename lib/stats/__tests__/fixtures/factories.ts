import type {
  EventRow,
  LessonRow,
  PracticeSegmentRow,
  RoundRow,
} from "@/lib/stats/types";

/**
 * Row factories for the stats tests. Each fills a complete, valid Row from the
 * generated database types and lets a test override only the fields under test —
 * so a case about "null three-putts" reads as exactly that, with no noise.
 */

const ATHLETE_ID = "0e57a1e7-0000-4000-a000-000000000001";
const SESSION_ID = "5e551040-0000-4000-a000-000000000001";

let sequence = 0;
function nextId(): string {
  sequence += 1;
  return `00000000-0000-4000-a000-${String(sequence).padStart(12, "0")}`;
}

export function makeRound(partial: Partial<RoundRow> = {}): RoundRow {
  return {
    id: nextId(),
    athlete_id: ATHLETE_ID,
    event_id: null,
    played_on: "2025-08-09",
    course: "Test Course",
    round_type: "tournament",
    holes: 18,
    par: 72,
    score: 100,
    penalty_strokes: null,
    three_putts: null,
    total_putts: null,
    fairways_hit: null,
    fairways_possible: null,
    greens_in_regulation: null,
    up_and_downs: null,
    doubles_or_worse: null,
    notes: null,
    created_at: "2025-08-09T00:00:00Z",
    updated_at: null,
    ...partial,
  };
}

export function makeEvent(partial: Partial<EventRow> = {}): EventRow {
  return {
    id: nextId(),
    athlete_id: ATHLETE_ID,
    tour_id: null,
    plays_on: "2025-08-09",
    name: "Test Event",
    course: "Test Course",
    city: "Dallas",
    holes: 18,
    entry_fee_cents: 0,
    priority: "priority",
    status: "played",
    notes: null,
    created_at: "2025-08-09T00:00:00Z",
    updated_at: null,
    ...partial,
  };
}

/**
 * A lesson. `created_at` tracks `occurred_on` by default so the newest-first sort
 * in `lib/stats/lessons` behaves the way a real log does; a test about same-day
 * ordering overrides it explicitly.
 */
export function makeLesson(partial: Partial<LessonRow> = {}): LessonRow {
  const occurredOn = partial.occurred_on ?? "2026-03-12";
  return {
    id: nextId(),
    athlete_id: ATHLETE_ID,
    coach_user_id: null,
    coach_name: "Coach Diaz",
    occurred_on: occurredOn,
    swing_key: null,
    drill_assigned: null,
    homework_target: null,
    homework_done: null,
    cost_cents: null,
    what_changed: null,
    created_at: `${occurredOn}T00:00:00Z`,
    updated_at: null,
    ...partial,
  };
}

export function makeSegment(
  partial: Partial<PracticeSegmentRow> = {},
): PracticeSegmentRow {
  return {
    id: nextId(),
    athlete_id: ATHLETE_ID,
    practice_session_id: SESSION_ID,
    session_type: "putting",
    minutes: 0,
    focus: null,
    drill: null,
    result: null,
    created_at: "2026-04-06T00:00:00Z",
    updated_at: null,
    ...partial,
  };
}
