import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { EventRow, LessonRow, RoundRow } from "@/lib/stats";

type GoalRow = Database["public"]["Tables"]["goals"]["Row"];
type LeakRow = Database["public"]["Tables"]["leaks"]["Row"];
type PhaseRow = Database["public"]["Tables"]["phases"]["Row"];

/**
 * The dashboard's read: everything the "am I getting there?" screen needs for
 * one athlete, in a single bundle. Each query is scoped by `athlete_id` — the
 * caller resolves that server-side from `auth.uid()` (see `getActiveAthleteId`)
 * and RLS is the backstop, so a query can only ever return rows the user is
 * allowed to see. No derived numbers are computed here; the page hands these
 * rows to `lib/stats` and `lib/dashboard/present`.
 */
export interface DashboardData {
  /** The active goal (most recent), or null if none is set yet. */
  goal: GoalRow | null;
  /** Leaks for the active goal, in strokes-saved order (biggest first). */
  leaks: LeakRow[];
  /** Every phase, by sequence. */
  phases: PhaseRow[];
  /** Every event, chronological. */
  events: EventRow[];
  /** Every round (all types); the engine filters to the qualifying set. */
  rounds: RoundRow[];
  /**
   * Every lesson, newest first — the order `outstandingHomework` reads. Only the
   * most recent one can carry outstanding homework, but the whole set is fetched
   * because "most recent" is the engine's call to make, not the query's.
   */
  lessons: LessonRow[];
}

export async function getDashboardData(
  supabase: SupabaseClient<Database>,
  athleteId: string,
): Promise<DashboardData> {
  // Most-recent goal drives the headline target. The MVP athlete has one goal;
  // ordering by creation keeps this correct once the goal editor (Session 14)
  // can add a new season's goal without deleting the old one.
  const { data: goal, error: goalError } = await supabase
    .from("goals")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (goalError) throw goalError;

  const [leaksResult, phasesResult, eventsResult, roundsResult, lessonsResult] =
    await Promise.all([
      goal
        ? supabase
            .from("leaks")
            .select("*")
            .eq("athlete_id", athleteId)
            .eq("goal_id", goal.id)
            .order("strokes_saved", { ascending: false })
        : Promise.resolve({ data: [] as LeakRow[], error: null }),
      supabase
        .from("phases")
        .select("*")
        .eq("athlete_id", athleteId)
        .order("seq", { ascending: true }),
      supabase
        .from("events")
        .select("*")
        .eq("athlete_id", athleteId)
        .order("plays_on", { ascending: true }),
      supabase
        .from("rounds")
        .select("*")
        .eq("athlete_id", athleteId)
        .order("played_on", { ascending: true }),
      supabase
        .from("lessons")
        .select("*")
        .eq("athlete_id", athleteId)
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

  if (leaksResult.error) throw leaksResult.error;
  if (phasesResult.error) throw phasesResult.error;
  if (eventsResult.error) throw eventsResult.error;
  if (roundsResult.error) throw roundsResult.error;
  if (lessonsResult.error) throw lessonsResult.error;

  return {
    goal: goal ?? null,
    leaks: leaksResult.data ?? [],
    phases: phasesResult.data ?? [],
    events: eventsResult.data ?? [],
    rounds: roundsResult.data ?? [],
    lessons: lessonsResult.data ?? [],
  };
}
