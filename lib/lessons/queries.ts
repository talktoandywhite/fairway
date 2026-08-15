import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { LessonRow } from "@/lib/stats";

/**
 * Server-side reads for the Lesson Log. Each query is filtered by `athlete_id` —
 * the caller resolves that from `auth.uid()` (see `getActiveAthleteId`) and RLS is
 * the backstop, so a query can only ever return rows the user is allowed to see.
 * No derived numbers are computed here: the pages hand these rows to `lib/stats`
 * (spend, outstanding homework) and `lib/lessons/present`.
 */

/**
 * Every lesson for an athlete, newest first — the order the log renders and the
 * order the hot index (`lessons_athlete_occurred_on_idx`) is built for. The
 * `created_at` tie-break matches the engine's own sort so "the most recent
 * lesson" means the same row here as it does in `outstandingHomework`.
 */
export async function getLessons(
  supabase: SupabaseClient<Database>,
  athleteId: string,
): Promise<LessonRow[]> {
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** A single lesson, or null if it doesn't exist / isn't the athlete's. */
export async function getLesson(
  supabase: SupabaseClient<Database>,
  athleteId: string,
  id: string,
): Promise<LessonRow | null> {
  const { data } = await supabase
    .from("lessons")
    .select("*")
    .eq("athlete_id", athleteId)
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}
