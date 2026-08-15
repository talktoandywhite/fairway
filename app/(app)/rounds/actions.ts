"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getActiveAthleteId } from "@/lib/auth/athlete";
import { roundSchema } from "@/lib/schemas/round";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * Server Actions for the Score Log. Every mutation re-parses its input with the
 * shared `roundSchema` before touching Supabase — the client form validates with
 * the same schema, but the client is never the security boundary (CLAUDE.md:
 * "Never trust the client, even though RLS is also protecting you").
 *
 * The active athlete is resolved SERVER-SIDE from `auth.uid()` via
 * `getActiveAthleteId`; a client-supplied athlete id is never read. RLS is the
 * backstop — the insert/update/delete policies delegate to `can_write_athlete` —
 * but resolving the owner here means the client never even names whose data it is.
 */

export type RoundActionState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

type RoundInsert = Database["public"]["Tables"]["rounds"]["Insert"];

const GENERIC_ERROR =
  "Something went wrong saving your round. Please try again.";
const NO_ATHLETE_ERROR =
  "We couldn't find your athlete profile. Please sign in again.";

/**
 * Pull the round fields out of a FormData into the raw shape `roundSchema`
 * expects. Optional detail keys that the form omitted come back as `null` from
 * `FormData.get`, and the schema's `optionalCount` turns that into a stored
 * `null` — "not recorded", never `0`. This is the single most important line of
 * the whole feature (see `lib/schemas/round.ts`), so it goes through the shared
 * schema and nothing here second-guesses it.
 */
function rawFromFormData(formData: FormData): Record<string, unknown> {
  const get = (key: string) => formData.get(key);
  return {
    played_on: get("played_on"),
    course: get("course"),
    round_type: get("round_type"),
    holes: get("holes"),
    par: get("par"),
    score: get("score"),
    penalty_strokes: get("penalty_strokes"),
    three_putts: get("three_putts"),
    total_putts: get("total_putts"),
    fairways_hit: get("fairways_hit"),
    fairways_possible: get("fairways_possible"),
    greens_in_regulation: get("greens_in_regulation"),
    up_and_downs: get("up_and_downs"),
    doubles_or_worse: get("doubles_or_worse"),
    notes: get("notes"),
  };
}

// --------------------------------------------------------------------------
// Create
// --------------------------------------------------------------------------

export async function createRoundAction(
  formData: FormData,
): Promise<RoundActionState> {
  const parsed = roundSchema.safeParse(rawFromFormData(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);
  if (!athleteId) return { error: NO_ATHLETE_ERROR };

  // Optional link to a scheduled event (the Session 10 "mark played → log the
  // round" handoff). The event id rides in as a hidden field; we only honour it
  // when it's a real event this athlete owns, so a forged id links nothing rather
  // than pointing a round at someone else's event. RLS already gates the read.
  const eventId = await resolveOwnedEventId(supabase, athleteId, formData);

  // athlete_id is stamped from the server-resolved owner, never from the client.
  const insert: RoundInsert = {
    athlete_id: athleteId,
    ...parsed.data,
    ...(eventId ? { event_id: eventId } : {}),
  };
  const { error } = await supabase.from("rounds").insert(insert);
  if (error) return { error: GENERIC_ERROR };

  // The list, the dashboard, and the linked event's schedule surfaces all read
  // this athlete's rounds; refresh them.
  revalidatePath("/rounds");
  revalidatePath("/dashboard");
  if (eventId) {
    revalidatePath("/schedule");
    revalidatePath(`/schedule/${eventId}`);
  }
  redirect("/rounds");
}

/**
 * Validate an optional `event_id` from the form and confirm it belongs to this
 * athlete before a round is linked to it. Returns the id when it checks out, else
 * null — a missing, malformed, or non-owned id simply produces an unlinked round.
 */
async function resolveOwnedEventId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  athleteId: string,
  formData: FormData,
): Promise<string | null> {
  const parsed = z.string().uuid().safeParse(formData.get("event_id"));
  if (!parsed.success) return null;
  const { data } = await supabase
    .from("events")
    .select("id")
    .eq("id", parsed.data)
    .eq("athlete_id", athleteId)
    .maybeSingle();
  return data?.id ?? null;
}

// --------------------------------------------------------------------------
// Update
// --------------------------------------------------------------------------

export async function updateRoundAction(
  formData: FormData,
): Promise<RoundActionState> {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: GENERIC_ERROR };

  const parsed = roundSchema.safeParse(rawFromFormData(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);
  if (!athleteId) return { error: NO_ATHLETE_ERROR };

  // Scope the update to this athlete's own row. RLS would already forbid writing
  // another athlete's round; matching athlete_id here makes that explicit and
  // means a mismatched id updates nothing rather than erroring.
  const { error } = await supabase
    .from("rounds")
    .update(parsed.data)
    .eq("id", id.data)
    .eq("athlete_id", athleteId);
  if (error) return { error: GENERIC_ERROR };

  revalidatePath("/rounds");
  revalidatePath(`/rounds/${id.data}`);
  revalidatePath("/dashboard");
  redirect(`/rounds/${id.data}`);
}

// --------------------------------------------------------------------------
// Delete
// --------------------------------------------------------------------------

/**
 * Delete a round. Returns to the list either way: from the detail page it's a
 * navigation, and from the list's optimistic delete the redirect simply
 * re-renders the already-updated list, reconciling the optimistic removal with
 * the server truth. RLS scopes the delete to a round the user may write; the
 * extra `athlete_id` match makes the ownership explicit.
 */
export async function deleteRoundAction(formData: FormData): Promise<void> {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) redirect("/rounds");

  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);
  if (!athleteId) redirect("/rounds");

  await supabase
    .from("rounds")
    .delete()
    .eq("id", id.data)
    .eq("athlete_id", athleteId);

  revalidatePath("/rounds");
  revalidatePath("/dashboard");
  redirect("/rounds");
}
