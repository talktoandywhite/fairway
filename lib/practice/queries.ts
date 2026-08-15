import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { PracticeSessionRow, RoundRow } from "@/lib/stats";

/**
 * Server-side reads for the Practice Log. Each query is filtered by `athlete_id`
 * — the caller resolves that from `auth.uid()` (see `getActiveAthleteId`) and RLS
 * is the backstop, so a query can only ever return rows the user is allowed to
 * see. No derived numbers are computed here: the page hands these rows to
 * `lib/stats` (minutes by type) and `lib/practice/present` (window, rollup, ratio).
 */

type AthleteLevel = Database["public"]["Enums"]["athlete_level"];

/**
 * Every practice session for an athlete, newest first — the order the log renders
 * and the order the hot index (`practice_sessions_athlete_occurred_on_idx`) is
 * built for. The window filter is applied in memory afterwards, because the
 * rollup, the ratio check and the list all read the same fetched set and
 * re-fetching per window would be a round trip for arithmetic we already have.
 */
export async function getPracticeSessions(
  supabase: SupabaseClient<Database>,
  athleteId: string,
): Promise<PracticeSessionRow[]> {
  const { data, error } = await supabase
    .from("practice_sessions")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** A single session by id, or null if it doesn't exist / isn't the athlete's. */
export async function getPracticeSession(
  supabase: SupabaseClient<Database>,
  athleteId: string,
  id: string,
): Promise<PracticeSessionRow | null> {
  const { data } = await supabase
    .from("practice_sessions")
    .select("*")
    .eq("athlete_id", athleteId)
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
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
