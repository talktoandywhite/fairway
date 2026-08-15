import type { EventRow, PracticeSegmentRow, RoundRow } from "@/lib/stats/types";
import { makeEvent, makeRound, makeSegment } from "./factories";

/**
 * The reference athlete, ported from `supabase/seed.sql` into typed fixtures so
 * the stats engine can be pinned to the workbook's numbers without a database.
 * These arrays mirror the seed exactly for the fields the engine reads (score,
 * type, holes, dates, detail counts, fees, minutes); the factories fill
 * everything else. If the seed's headline data changes, these fixtures — and the
 * oracle test that reads them — must change with it.
 */

/**
 * All rounds: twelve 18-hole tournament rounds (116 → 100, one honest bump),
 * then three deliberately-excluded non-tournament rounds (a simulated 105, a
 * practice 98 — the best raw score in the set — and a nine-hole 46).
 */
export const seedRounds: RoundRow[] = [
  // Twelve tournament rounds carrying the scoring average and its downtrend.
  makeRound({ played_on: "2025-08-09", score: 116, penalty_strokes: 9, three_putts: 6, total_putts: 38 }), // prettier-ignore
  makeRound({ played_on: "2025-08-23", score: 114, penalty_strokes: 8, three_putts: 5, total_putts: 37 }), // prettier-ignore
  makeRound({ played_on: "2025-09-13", score: 112, penalty_strokes: 7, three_putts: 5, total_putts: 36 }), // prettier-ignore
  makeRound({ played_on: "2025-09-27", score: 110, penalty_strokes: 6, three_putts: 4, total_putts: 35 }), // prettier-ignore
  makeRound({ played_on: "2025-10-11", score: 109, penalty_strokes: 5, three_putts: 4, total_putts: 34 }), // prettier-ignore
  makeRound({ played_on: "2025-10-25", score: 107, penalty_strokes: 5, three_putts: 3, total_putts: 34 }), // prettier-ignore
  makeRound({ played_on: "2025-11-08", score: 106, penalty_strokes: 4, three_putts: 3, total_putts: 33 }), // prettier-ignore
  makeRound({ played_on: "2026-02-14", score: 105, penalty_strokes: 4, three_putts: 3, total_putts: 33 }), // prettier-ignore
  makeRound({ played_on: "2026-03-07", score: 103, penalty_strokes: 3, three_putts: 2, total_putts: 32 }), // prettier-ignore
  makeRound({ played_on: "2026-03-21", score: 104, penalty_strokes: 3, three_putts: 3, total_putts: 32 }), // prettier-ignore
  makeRound({ played_on: "2026-04-11", score: 101, penalty_strokes: 2, three_putts: 2, total_putts: 31 }), // prettier-ignore
  makeRound({ played_on: "2026-05-02", score: 100, penalty_strokes: 2, three_putts: 2, total_putts: 30 }), // prettier-ignore
  // Non-tournament rounds — excluded from every headline metric.
  makeRound({ played_on: "2026-01-20", score: 105, round_type: "simulated_tournament", penalty_strokes: 3, three_putts: 3, total_putts: 33 }), // prettier-ignore
  makeRound({ played_on: "2026-04-25", score: 98, round_type: "practice_round", penalty_strokes: 2, three_putts: 1, total_putts: 30 }), // prettier-ignore
  makeRound({ played_on: "2026-05-05", score: 46, round_type: "nine_hole", holes: 9, par: 36, penalty_strokes: 1, three_putts: 1, total_putts: 16 }), // prettier-ignore
];

/**
 * The season schedule: thirteen played events, one skipped stretch event
 * (2025-12-06), and two upcoming fall-2026 events. The skipped one must drop out
 * of gaps and the fee total.
 */
export const seedEvents: EventRow[] = [
  makeEvent({ plays_on: "2025-08-09", entry_fee_cents: 8500, status: "played" }), // prettier-ignore
  makeEvent({ plays_on: "2025-08-23", entry_fee_cents: 6000, status: "played" }), // prettier-ignore
  makeEvent({ plays_on: "2025-09-13", entry_fee_cents: 8500, status: "played" }), // prettier-ignore
  makeEvent({ plays_on: "2025-09-27", entry_fee_cents: 17500, status: "played" }), // prettier-ignore
  makeEvent({ plays_on: "2025-10-11", entry_fee_cents: 6000, status: "played" }), // prettier-ignore
  makeEvent({ plays_on: "2025-10-25", entry_fee_cents: 8500, status: "played" }), // prettier-ignore
  makeEvent({ plays_on: "2025-11-08", entry_fee_cents: 21900, status: "played" }), // prettier-ignore
  makeEvent({ plays_on: "2025-12-06", entry_fee_cents: 21900, status: "skipped" }), // prettier-ignore
  makeEvent({ plays_on: "2026-02-14", entry_fee_cents: 0, status: "played" }),
  makeEvent({ plays_on: "2026-03-07", entry_fee_cents: 17500, status: "played" }), // prettier-ignore
  makeEvent({ plays_on: "2026-03-21", entry_fee_cents: 6000, status: "played" }), // prettier-ignore
  makeEvent({ plays_on: "2026-04-11", entry_fee_cents: 8500, status: "played" }), // prettier-ignore
  makeEvent({ plays_on: "2026-05-02", entry_fee_cents: 0, status: "played" }),
  makeEvent({ plays_on: "2026-09-05", entry_fee_cents: 8500, status: "registered" }), // prettier-ignore
  makeEvent({ plays_on: "2026-10-03", entry_fee_cents: 6000, status: "not_registered" }), // prettier-ignore
];

/**
 * The seventeen practice segments — deliberately short-game/putting heavy. In
 * the seeded database these sit inside fifteen sessions (two days are
 * multi-discipline blocks), but the engine counts segments, so the parent
 * grouping does not change a single number here.
 */
export const seedPracticeSegments: PracticeSegmentRow[] = [
  makeSegment({ session_type: "putting", minutes: 45 }),
  makeSegment({ session_type: "short_game", minutes: 60 }),
  makeSegment({ session_type: "range_wedges", minutes: 45 }),
  makeSegment({ session_type: "putting", minutes: 30 }),
  makeSegment({ session_type: "short_game", minutes: 60 }),
  makeSegment({ session_type: "range_full_swing", minutes: 45 }),
  makeSegment({ session_type: "putting", minutes: 45 }),
  makeSegment({ session_type: "short_game", minutes: 75 }),
  makeSegment({ session_type: "on_course", minutes: 120 }),
  makeSegment({ session_type: "range_wedges", minutes: 45 }),
  makeSegment({ session_type: "exercise", minutes: 50 }),
  makeSegment({ session_type: "putting", minutes: 30 }),
  makeSegment({ session_type: "short_game", minutes: 60 }),
  makeSegment({ session_type: "range_full_swing", minutes: 60 }),
  makeSegment({ session_type: "exercise", minutes: 50 }),
  makeSegment({ session_type: "short_game", minutes: 45 }),
  makeSegment({ session_type: "on_course", minutes: 120 }),
];
