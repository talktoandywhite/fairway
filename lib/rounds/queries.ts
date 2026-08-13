import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { RoundRow } from "@/lib/stats";

/**
 * Server-side reads for the Score Log. Each is scoped by `athlete_id` — the
 * caller resolves that from `auth.uid()` (see `getActiveAthleteId`) and RLS is
 * the backstop, so a query can only ever return rows the user is allowed to see.
 */

/** Every round for an athlete, newest first — the order the list and stats want. */
export async function getRounds(
  supabase: SupabaseClient<Database>,
  athleteId: string,
): Promise<RoundRow[]> {
  const { data, error } = await supabase
    .from("rounds")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("played_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** A single round by id, or null if it doesn't exist / isn't the athlete's. */
export async function getRound(
  supabase: SupabaseClient<Database>,
  athleteId: string,
  id: string,
): Promise<RoundRow | null> {
  const { data } = await supabase
    .from("rounds")
    .select("*")
    .eq("athlete_id", athleteId)
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}

/**
 * Distinct course names from the athlete's own history, most-recently-played
 * first — the source for the round form's course autocomplete. Deduped in JS
 * (PostgREST has no clean DISTINCT), preserving recency so the courses an
 * athlete plays often surface first.
 */
export async function getDistinctCourses(
  supabase: SupabaseClient<Database>,
  athleteId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("rounds")
    .select("course, played_on")
    .eq("athlete_id", athleteId)
    .order("played_on", { ascending: false });

  const seen = new Set<string>();
  const courses: string[] = [];
  for (const row of data ?? []) {
    const course = row.course.trim();
    if (course && !seen.has(course)) {
      seen.add(course);
      courses.push(course);
    }
  }
  return courses;
}
