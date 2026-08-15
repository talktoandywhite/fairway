"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getActiveAthleteId } from "@/lib/auth/athlete";
import { lessonSchema } from "@/lib/schemas/lesson";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * Server Actions for the Lesson Log. Every mutation re-parses its input with the
 * shared `lessonSchema` before touching Supabase — the client form validates with
 * the same schema, but the client is never the security boundary (CLAUDE.md:
 * "Never trust the client, even though RLS is also protecting you").
 *
 * The active athlete is resolved SERVER-SIDE from `auth.uid()` via
 * `getActiveAthleteId`; a client-supplied athlete id is never read. RLS is the
 * backstop — the `lessons` policies delegate to `can_read_athlete` /
 * `can_write_athlete` — but resolving the owner here means the client never even
 * names whose data it is.
 *
 * `coach_user_id` is never written here. It is reserved for Session 18, when a
 * linked coach authors the entry directly; in the MVP a lesson is athlete-authored
 * and the coach is free text.
 */

export type LessonActionState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

type LessonInsert = Database["public"]["Tables"]["lessons"]["Insert"];

const GENERIC_ERROR =
  "Something went wrong saving this lesson. Please try again.";
const NO_ATHLETE_ERROR =
  "We couldn't find your athlete profile. Please sign in again.";

/** Pull the lesson out of a FormData. Every value is untrusted input and goes
 * straight to Zod, which owns the coercions (dollars → cents, "" → null). */
function rawFromFormData(formData: FormData): Record<string, unknown> {
  return {
    occurred_on: formData.get("occurred_on"),
    coach_name: formData.get("coach_name"),
    swing_key: formData.get("swing_key"),
    drill_assigned: formData.get("drill_assigned"),
    homework_target: formData.get("homework_target"),
    homework_done: formData.get("homework_done"),
    cost: formData.get("cost"),
    what_changed: formData.get("what_changed"),
  };
}

/** Zod reports an issue at the path of the field that caused it, and the form
 * holds its fields under those exact names — so passing them through unflattened
 * is what lets an error land on the right input rather than on the form. */
function fieldErrorsFrom(
  error: z.ZodError<unknown>,
): Record<string, string[] | undefined> {
  const errors: Record<string, string[] | undefined> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    (errors[key] ??= []).push(issue.message);
  }
  return errors;
}

/**
 * Revalidate every surface that reads this athlete's lessons. The log is
 * revalidated at the LAYOUT level so the whole `/lessons` + `/lessons/[id]`
 * subtree is busted in the client router cache — a literal `/lessons/<id>`
 * revalidate does not reliably clear a dynamic route (the Session 10 finding).
 * The dashboard goes too: the outstanding-homework card is read from these rows.
 */
function revalidateLessons() {
  revalidatePath("/lessons", "layout");
  revalidatePath("/dashboard");
}

// --------------------------------------------------------------------------
// Create
// --------------------------------------------------------------------------

export async function createLessonAction(
  formData: FormData,
): Promise<LessonActionState> {
  const parsed = lessonSchema.safeParse(rawFromFormData(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);
  if (!athleteId) return { error: NO_ATHLETE_ERROR };

  const insert: LessonInsert = { athlete_id: athleteId, ...parsed.data };
  const { error } = await supabase.from("lessons").insert(insert);
  if (error) return { error: GENERIC_ERROR };

  revalidateLessons();
  redirect("/lessons");
}

// --------------------------------------------------------------------------
// Update
// --------------------------------------------------------------------------

export async function updateLessonAction(
  formData: FormData,
): Promise<LessonActionState> {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: GENERIC_ERROR };

  const parsed = lessonSchema.safeParse(rawFromFormData(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);
  if (!athleteId) return { error: NO_ATHLETE_ERROR };

  // Scope to this athlete's own row. RLS already forbids writing someone else's
  // lesson; matching athlete_id makes that explicit and means a mismatched id
  // updates nothing rather than erroring.
  const { error } = await supabase
    .from("lessons")
    .update(parsed.data)
    .eq("id", id.data)
    .eq("athlete_id", athleteId);
  if (error) return { error: GENERIC_ERROR };

  revalidateLessons();
  redirect(`/lessons/${id.data}`);
}

// --------------------------------------------------------------------------
// Delete
// --------------------------------------------------------------------------

/**
 * Delete a lesson. Returns to the log either way: from the detail page it's a
 * navigation, and from the list's optimistic delete the redirect simply
 * re-renders the already-updated list. RLS scopes the delete to a row the user
 * may write; the extra `athlete_id` match makes it explicit.
 */
export async function deleteLessonAction(formData: FormData): Promise<void> {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) redirect("/lessons");

  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);
  if (!athleteId) redirect("/lessons");

  await supabase
    .from("lessons")
    .delete()
    .eq("id", id.data)
    .eq("athlete_id", athleteId);

  revalidateLessons();
  redirect("/lessons");
}
