import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { EventRow } from "@/lib/stats";

/**
 * Server-side reads for the Tournament Plan. Each athlete-scoped query is filtered
 * by `athlete_id` — the caller resolves that from `auth.uid()` (see
 * `getActiveAthleteId`) and RLS is the backstop, so a query can only ever return
 * rows the user is allowed to see. No derived numbers are computed here; the page
 * hands these rows to `lib/stats` (gaps, fees) and `lib/schedule/present`.
 */

/** The tour catalog row, trimmed to what the schedule shows/picks. */
export type TourOption = {
  id: string;
  name: string;
};

/** An event joined to its tour's display name (null when it references no tour,
 * or the tour was removed from the catalog). */
export type EventWithTour = EventRow & {
  tour: { name: string } | null;
};

/** Every event for an athlete, chronological — the order the schedule renders and
 * the engine's gap math expects. The tour name is joined for display. */
export async function getEvents(
  supabase: SupabaseClient<Database>,
  athleteId: string,
): Promise<EventWithTour[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*, tour:tours(name)")
    .eq("athlete_id", athleteId)
    .order("plays_on", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EventWithTour[];
}

/** A single event by id, or null if it doesn't exist / isn't the athlete's. */
export async function getEvent(
  supabase: SupabaseClient<Database>,
  athleteId: string,
  id: string,
): Promise<EventWithTour | null> {
  const { data } = await supabase
    .from("events")
    .select("*, tour:tours(name)")
    .eq("athlete_id", athleteId)
    .eq("id", id)
    .maybeSingle();
  return (data as EventWithTour | null) ?? null;
}

/**
 * The shared tour catalog, alphabetical — the options for the event form's tour
 * picker. `tours` is a read-only reference table (migration 0006): every
 * authenticated user reads the same rows and no one writes it through the data
 * API, so this is not athlete-scoped.
 */
export async function getTours(
  supabase: SupabaseClient<Database>,
): Promise<TourOption[]> {
  const { data, error } = await supabase
    .from("tours")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * Whether a round is already linked to this event — drives the "log the round"
 * offer after an event is marked played (a round carries `event_id`). Returns the
 * linked round's id, or null when none is logged yet. Athlete-scoped and
 * RLS-backed like every other read here.
 */
export async function getLinkedRoundId(
  supabase: SupabaseClient<Database>,
  athleteId: string,
  eventId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("rounds")
    .select("id")
    .eq("athlete_id", athleteId)
    .eq("event_id", eventId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}
