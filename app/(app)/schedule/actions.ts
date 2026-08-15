"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getActiveAthleteId } from "@/lib/auth/athlete";
import { EVENT_STATUSES, eventSchema } from "@/lib/schemas/event";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * Server Actions for the Tournament Plan. Every mutation re-parses its input with
 * the shared `eventSchema` before touching Supabase — the client form validates
 * with the same schema, but the client is never the security boundary (CLAUDE.md:
 * "Never trust the client, even though RLS is also protecting you").
 *
 * The active athlete is resolved SERVER-SIDE from `auth.uid()` via
 * `getActiveAthleteId`; a client-supplied athlete id is never read. RLS is the
 * backstop — the events insert/update/delete policies delegate to
 * `can_write_athlete` — but resolving the owner here means the client never even
 * names whose data it is.
 */

export type EventActionState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

type EventInsert = Database["public"]["Tables"]["events"]["Insert"];

const GENERIC_ERROR =
  "Something went wrong saving this event. Please try again.";
const NO_ATHLETE_ERROR =
  "We couldn't find your athlete profile. Please sign in again.";

/** Pull the event fields out of a FormData into the raw shape `eventSchema`
 * expects. The fee arrives as the `entry_fee` dollars string; the schema converts
 * it to integer cents. */
function rawFromFormData(formData: FormData): Record<string, unknown> {
  const get = (key: string) => formData.get(key);
  return {
    name: get("name"),
    plays_on: get("plays_on"),
    tour_id: get("tour_id"),
    course: get("course"),
    city: get("city"),
    holes: get("holes"),
    entry_fee: get("entry_fee"),
    priority: get("priority"),
    status: get("status"),
    notes: get("notes"),
  };
}

/** Revalidate every surface that reads this athlete's events. The schedule list,
 * the event's own detail page, and the dashboard (next event, gap warning) all
 * derive from the same rows. The schedule is revalidated at the LAYOUT level so
 * the whole `/schedule` + `/schedule/[id]` subtree is busted in the client router
 * cache — a literal `/schedule/<id>` revalidate does not reliably clear a dynamic
 * route, which left an in-place status change showing the pre-change value. */
function revalidateEvent() {
  revalidatePath("/schedule", "layout");
  revalidatePath("/dashboard");
}

// --------------------------------------------------------------------------
// Create
// --------------------------------------------------------------------------

export async function createEventAction(
  formData: FormData,
): Promise<EventActionState> {
  const parsed = eventSchema.safeParse(rawFromFormData(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);
  if (!athleteId) return { error: NO_ATHLETE_ERROR };

  // athlete_id is stamped from the server-resolved owner, never from the client.
  const insert: EventInsert = { athlete_id: athleteId, ...parsed.data };
  const { error } = await supabase.from("events").insert(insert);
  if (error) return { error: GENERIC_ERROR };

  revalidateEvent();
  redirect("/schedule");
}

// --------------------------------------------------------------------------
// Update
// --------------------------------------------------------------------------

export async function updateEventAction(
  formData: FormData,
): Promise<EventActionState> {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: GENERIC_ERROR };

  const parsed = eventSchema.safeParse(rawFromFormData(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);
  if (!athleteId) return { error: NO_ATHLETE_ERROR };

  // Scope to this athlete's own row. RLS already forbids writing another
  // athlete's event; matching athlete_id makes that explicit and means a
  // mismatched id updates nothing rather than erroring.
  const { error } = await supabase
    .from("events")
    .update(parsed.data)
    .eq("id", id.data)
    .eq("athlete_id", athleteId);
  if (error) return { error: GENERIC_ERROR };

  revalidateEvent();
  redirect(`/schedule/${id.data}`);
}

// --------------------------------------------------------------------------
// Status transition (not_registered → registered → played, or → skipped)
// --------------------------------------------------------------------------

/**
 * Move a single event to a new status. Used by the detail page's "advance" button
 * (the happy path `not_registered → registered → played`) and the "skip"/"unskip"
 * controls. The id and status ride in a FormData; the status is validated against
 * the enum and the row is scoped to the athlete. Marking an event `played` does
 * NOT auto-create a round — the detail page then OFFERS to log the linked round (a
 * round carries `event_id`), keeping "played" honest for an event whose score
 * isn't in hand yet.
 *
 * The control lives on the event's OWN detail page, so this does NOT redirect: it
 * updates, revalidates the other event-reading surfaces (the list and the
 * dashboard), and returns. The client control then calls `router.refresh()` to
 * re-fetch this page's server components uncached — which surfaces the "log the
 * round" offer once an event is played. (A redirect back to the same URL is
 * served from the client router cache and shows the pre-change status.)
 *
 * Returns a plain error string so the client control can surface it in place. A
 * bad input or missing athlete is a silent no-op; RLS makes a cross-athlete write
 * a no-op too.
 */
export async function setEventStatusAction(
  eventId: string,
  status: string,
): Promise<{ error?: string }> {
  const id = z.string().uuid().safeParse(eventId);
  const nextStatus = z.enum(EVENT_STATUSES).safeParse(status);
  if (!id.success || !nextStatus.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);
  if (!athleteId) return { error: NO_ATHLETE_ERROR };

  const { error } = await supabase
    .from("events")
    .update({ status: nextStatus.data })
    .eq("id", id.data)
    .eq("athlete_id", athleteId);
  if (error) return { error: GENERIC_ERROR };

  revalidateEvent();
  return {};
}

// --------------------------------------------------------------------------
// Delete
// --------------------------------------------------------------------------

/**
 * Delete an event. Returns to the schedule either way: from the detail page it's
 * a navigation, and from the list's optimistic delete the redirect simply
 * re-renders the already-updated list. RLS scopes the delete to an event the user
 * may write; the extra `athlete_id` match makes the ownership explicit.
 */
export async function deleteEventAction(formData: FormData): Promise<void> {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) redirect("/schedule");

  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);
  if (!athleteId) redirect("/schedule");

  await supabase
    .from("events")
    .delete()
    .eq("id", id.data)
    .eq("athlete_id", athleteId);

  revalidateEvent();
  redirect("/schedule");
}
