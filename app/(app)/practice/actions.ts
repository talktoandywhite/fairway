"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getActiveAthleteId } from "@/lib/auth/athlete";
import { practiceSchema } from "@/lib/schemas/practice";
import type { PracticeInput } from "@/lib/schemas/practice";
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
 * backstop — the `practice_sessions` and `practice_segments` policies both
 * delegate to `can_write_athlete` — but resolving the owner here means the client
 * never even names whose data it is.
 *
 * A session is written as two things: the block row, and its segments. Keeping
 * those consistent is the interesting part of this file, and each path below says
 * how it does it.
 */

export type PracticeActionState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

type SessionInsert =
  Database["public"]["Tables"]["practice_sessions"]["Insert"];
type SegmentInsert =
  Database["public"]["Tables"]["practice_segments"]["Insert"];

const GENERIC_ERROR =
  "Something went wrong saving this session. Please try again.";
const NO_ATHLETE_ERROR =
  "We couldn't find your athlete profile. Please sign in again.";

/**
 * Pull the session out of a FormData. The segments ride as a JSON array under a
 * single key: they are a variable-length list of objects, and flattening them
 * into `segments[0][minutes]`-style keys would be a parser to get wrong on both
 * sides for no gain. The JSON is untrusted input like everything else here and is
 * handed straight to Zod.
 */
function rawFromFormData(formData: FormData): Record<string, unknown> {
  const rawSegments = formData.get("segments");
  let segments: unknown = [];
  if (typeof rawSegments === "string") {
    try {
      segments = JSON.parse(rawSegments);
    } catch {
      // Leave it as [] — the schema's "at least one" rule reports it as a
      // field error rather than this throwing a 500.
      segments = [];
    }
  }
  return {
    occurred_on: formData.get("occurred_on"),
    notes: formData.get("notes"),
    segments,
  };
}

/**
 * Zod reports a bad segment at a path like `segments.0.minutes`. The form holds
 * its fields under those exact names (react-hook-form's `useFieldArray` naming),
 * so passing them through unflattened is what lets an error land on the right
 * minutes box rather than on the form as a whole.
 */
function fieldErrorsFrom(
  error: z.ZodError<unknown>,
): Record<string, string[] | undefined> {
  const errors: Record<string, string[] | undefined> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "segments";
    (errors[key] ??= []).push(issue.message);
  }
  return errors;
}

/** Revalidate every surface that reads this athlete's practice. The log is
 * revalidated at the LAYOUT level so the whole `/practice` + `/practice/[id]`
 * subtree is busted in the client router cache — a literal `/practice/<id>`
 * revalidate does not reliably clear a dynamic route (the Session 10 finding). */
function revalidatePractice() {
  revalidatePath("/practice", "layout");
  revalidatePath("/dashboard");
}

/** The segment rows for a session, in the order the athlete arranged them. */
function segmentRows(
  sessionId: string,
  athleteId: string,
  parsed: PracticeInput,
): SegmentInsert[] {
  return parsed.segments.map((segment) => ({
    practice_session_id: sessionId,
    athlete_id: athleteId,
    ...segment,
  }));
}

// --------------------------------------------------------------------------
// Create
// --------------------------------------------------------------------------

export async function createPracticeAction(
  formData: FormData,
): Promise<PracticeActionState> {
  const parsed = practiceSchema.safeParse(rawFromFormData(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);
  if (!athleteId) return { error: NO_ATHLETE_ERROR };

  // The id is generated here rather than read back from the insert. Two reasons:
  // the segments need it immediately, and `.insert().select()` is the shape that
  // trips RLS on athlete-owned tables in this schema (see the athletes
  // INSERT...RETURNING finding). Knowing the id up front sidesteps both.
  const sessionId = crypto.randomUUID();
  const insert: SessionInsert = {
    id: sessionId,
    athlete_id: athleteId,
    occurred_on: parsed.data.occurred_on,
    notes: parsed.data.notes,
  };

  const { error: sessionError } = await supabase
    .from("practice_sessions")
    .insert(insert);
  if (sessionError) return { error: GENERIC_ERROR };

  // One multi-row insert, so the segments land together or not at all.
  const { error: segmentError } = await supabase
    .from("practice_segments")
    .insert(segmentRows(sessionId, athleteId, parsed.data));

  if (segmentError) {
    // Compensate: a session with no segments is worse than no session. It would
    // sit in the log looking logged while contributing nothing to the rollup.
    await supabase
      .from("practice_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("athlete_id", athleteId);
    return { error: GENERIC_ERROR };
  }

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
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);
  if (!athleteId) return { error: NO_ATHLETE_ERROR };

  // Scope to this athlete's own row. RLS already forbids writing another
  // athlete's session; matching athlete_id makes that explicit and means a
  // mismatched id updates nothing rather than erroring.
  const { error: sessionError } = await supabase
    .from("practice_sessions")
    .update({
      occurred_on: parsed.data.occurred_on,
      notes: parsed.data.notes,
    })
    .eq("id", id.data)
    .eq("athlete_id", athleteId);
  if (sessionError) return { error: GENERIC_ERROR };

  // Editing replaces the whole set of segments — the athlete may have dropped a
  // discipline, added one, or re-timed all of them. That is a delete and an
  // insert, which as two calls could half-happen and strand the session with no
  // minutes, so it goes through the SECURITY INVOKER function that does both in
  // one transaction. RLS still decides what it may touch.
  const { error: segmentError } = await supabase.rpc(
    "replace_practice_segments",
    {
      p_session_id: id.data,
      p_segments: parsed.data.segments,
    },
  );
  if (segmentError) return { error: GENERIC_ERROR };

  revalidatePractice();
  redirect(`/practice/${id.data}`);
}

// --------------------------------------------------------------------------
// Delete
// --------------------------------------------------------------------------

/**
 * Delete a practice session. Its segments go with it — the composite FK cascades
 * — so there is no orphan to sweep. Returns to the log either way: from the
 * detail page it's a navigation, and from the list's optimistic delete the
 * redirect simply re-renders the already-updated list. RLS scopes the delete to a
 * row the user may write; the extra `athlete_id` match makes it explicit.
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
