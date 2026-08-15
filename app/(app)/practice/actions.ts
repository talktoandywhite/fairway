"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getActiveAthleteId } from "@/lib/auth/athlete";
import { practiceSchema } from "@/lib/schemas/practice";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * Server Actions for the Practice Log. Every mutation re-parses its input with
 * the shared `practiceSchema` before touching Supabase — the client form
 * validates with the same schema, but the client is never the security boundary
 * (CLAUDE.md: "Never trust the client, even though RLS is also protecting you").
 *
 * The active athlete is resolved SERVER-SIDE from `auth.uid()` via
 * `getActiveAthleteId`; a client-supplied athlete id is never read. RLS is the
 * backstop — the `practice_sessions` policies delegate to `can_write_athlete` —
 * but resolving the owner here means the client never even names whose data it is.
 */

export type PracticeActionState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

type PracticeInsert =
  Database["public"]["Tables"]["practice_sessions"]["Insert"];

const GENERIC_ERROR =
  "Something went wrong saving this session. Please try again.";
const NO_ATHLETE_ERROR =
  "We couldn't find your athlete profile. Please sign in again.";

/** Pull the practice fields out of a FormData into the raw shape the schema
 * expects. Absent optional keys arrive as `null` and are stored as null. */
function rawFromFormData(formData: FormData): Record<string, unknown> {
  const get = (key: string) => formData.get(key);
  return {
    occurred_on: get("occurred_on"),
    session_type: get("session_type"),
    minutes: get("minutes"),
    focus: get("focus"),
    drill: get("drill"),
    result: get("result"),
    notes: get("notes"),
  };
}

/**
 * Revalidate every surface that reads this athlete's practice sessions. The log
 * is revalidated at the LAYOUT level so the whole `/practice` + `/practice/[id]`
 * subtree is busted in the client router cache — a literal `/practice/<id>`
 * revalidate does not reliably clear a dynamic route (the Session 10 finding).
 * The dashboard is included because later sessions surface practice minutes
 * there, and a stale rollup is worse than an extra revalidate.
 */
function revalidatePractice() {
  revalidatePath("/practice", "layout");
  revalidatePath("/dashboard");
}

// --------------------------------------------------------------------------
// Create
// --------------------------------------------------------------------------

export async function createPracticeAction(
  formData: FormData,
): Promise<PracticeActionState> {
  const parsed = practiceSchema.safeParse(rawFromFormData(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);
  if (!athleteId) return { error: NO_ATHLETE_ERROR };

  // athlete_id is stamped from the server-resolved owner, never from the client.
  const insert: PracticeInsert = { athlete_id: athleteId, ...parsed.data };
  const { error } = await supabase.from("practice_sessions").insert(insert);
  if (error) return { error: GENERIC_ERROR };

  revalidatePractice();
  redirect("/practice");
}

// --------------------------------------------------------------------------
// Update
// --------------------------------------------------------------------------

export async function updatePracticeAction(
  formData: FormData,
): Promise<PracticeActionState> {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: GENERIC_ERROR };

  const parsed = practiceSchema.safeParse(rawFromFormData(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);
  if (!athleteId) return { error: NO_ATHLETE_ERROR };

  // Scope to this athlete's own row. RLS already forbids writing another
  // athlete's session; matching athlete_id makes that explicit and means a
  // mismatched id updates nothing rather than erroring.
  const { error } = await supabase
    .from("practice_sessions")
    .update(parsed.data)
    .eq("id", id.data)
    .eq("athlete_id", athleteId);
  if (error) return { error: GENERIC_ERROR };

  revalidatePractice();
  redirect(`/practice/${id.data}`);
}

// --------------------------------------------------------------------------
// Delete
// --------------------------------------------------------------------------

/**
 * Delete a practice session. Returns to the log either way: from the detail page
 * it's a navigation, and from the list's optimistic delete the redirect simply
 * re-renders the already-updated list. RLS scopes the delete to a row the user
 * may write; the extra `athlete_id` match makes the ownership explicit.
 */
export async function deletePracticeAction(formData: FormData): Promise<void> {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) redirect("/practice");

  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);
  if (!athleteId) redirect("/practice");

  await supabase
    .from("practice_sessions")
    .delete()
    .eq("id", id.data)
    .eq("athlete_id", athleteId);

  revalidatePractice();
  redirect("/practice");
}
