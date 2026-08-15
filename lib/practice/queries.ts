import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  PracticeSegmentRow,
  PracticeSessionRow,
  RoundRow,
} from "@/lib/stats";

/**
 * Server-side reads for the Practice Log. Each query is filtered by `athlete_id`
 * — the caller resolves that from `auth.uid()` (see `getActiveAthleteId`) and RLS
 * is the backstop, so a query can only ever return rows the user is allowed to
 * see. No derived numbers are computed here: the page hands these rows to
 * `lib/stats` (minutes by type) and `lib/practice/present` (window, rollup, ratio).
 */

type AthleteLevel = Database["public"]["Enums"]["athlete_level"];

/** A day's block with the disciplines worked on inside it. The segments carry the
 * minutes; the session carries the date the window filters on. */
export type PracticeSessionWithSegments = PracticeSessionRow & {
  segments: PracticeSegmentRow[];
};

/**
 * Every practice session for an athlete with its segments, newest first — the
 * order the log renders and the order the hot index
 * (`practice_sessions_athlete_occurred_on_idx`) is built for. The window filter
 * is applied in memory afterwards, because the rollup, the ratio check and the
 * list all read the same fetched set and re-fetching per window would be a round
 * trip for arithmetic we already have.
 *
 * Segments come back ordered by `session_type`, which on a Postgres enum sorts by
 * the enum's own declaration order — the same fixed order the rollup, the chart
 * slots and `SESSION_TYPES` use. Creation order would be non-deterministic (a
 * session's segments are written in one statement and share a timestamp), and a
 * session whose disciplines reshuffle between renders is a bug that looks like a
 * ghost. It also reads well: golf work first, exercise and lessons last.
 */
export async function getPracticeSessions(
  supabase: SupabaseClient<Database>,
  athleteId: string,
): Promise<PracticeSessionWithSegments[]> {
  const { data, error } = await supabase
    .from("practice_sessions")
    .select("*, segments:practice_segments(*)")
    .eq("athlete_id", athleteId)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .order("session_type", {
      referencedTable: "practice_segments",
      ascending: true,
    });
  if (error) throw error;
  return (data ?? []) as PracticeSessionWithSegments[];
}

/** A single session with its segments, or null if it doesn't exist / isn't the
 * athlete's. */
export async function getPracticeSession(
  supabase: SupabaseClient<Database>,
  athleteId: string,
  id: string,
): Promise<PracticeSessionWithSegments | null> {
  const { data } = await supabase
    .from("practice_sessions")
    .select("*, segments:practice_segments(*)")
    .eq("athlete_id", athleteId)
    .eq("id", id)
    .order("session_type", {
      referencedTable: "practice_segments",
      ascending: true,
    })
    .maybeSingle();
  return (data as PracticeSessionWithSegments | null) ?? null;
}

/** Every segment across a set of sessions, flattened — what the engine counts.
 * Pure and trivial, but it lives here so no page re-derives "the minutes are on
 * the segments" for itself. */
export function segmentsOf(
  sessions: PracticeSessionWithSegments[],
): PracticeSegmentRow[] {
  return sessions.flatMap((s) => s.segments);
}

/**
 * The two facts the ratio check needs about the athlete beyond their sessions:
 * every round (so the engine can take the scoring average — the honest basis for
 * the healthy-mix band) and the athlete's competitive level (the weaker fallback
 * when no tournament round has been logged yet).
 *
 * Rounds are fetched whole and handed to `scoringAverage`, which owns the
 * "18-hole tournament only" rule; filtering here would fork that definition.
 */
export interface RatioBasisData {
  rounds: RoundRow[];
  level: AthleteLevel;
}

export async function getRatioBasisData(
  supabase: SupabaseClient<Database>,
  athleteId: string,
): Promise<RatioBasisData> {
  const [roundsResult, athleteResult] = await Promise.all([
    supabase
      .from("rounds")
      .select("*")
      .eq("athlete_id", athleteId)
      .order("played_on", { ascending: true }),
    supabase.from("athletes").select("level").eq("id", athleteId).maybeSingle(),
  ]);

  if (roundsResult.error) throw roundsResult.error;
  if (athleteResult.error) throw athleteResult.error;

  return {
    rounds: roundsResult.data ?? [],
    // `junior` is the column's own default, so an athlete row that somehow can't
    // be read falls back to the most conservative band rather than failing.
    level: athleteResult.data?.level ?? "junior",
  };
}
