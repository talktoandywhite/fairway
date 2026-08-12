import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Resolve the active athlete for the signed-in user, server-side, from
 * `auth.uid()` — never from a client-supplied id (CLAUDE.md: "Never trust the
 * client"; the backlog's Session 8 carry-forward: "Resolve the active athlete
 * SERVER-SIDE from the authenticated user").
 *
 * In the MVP a user owns exactly one athlete row (`athletes.user_id = auth.uid()`),
 * so there is nothing to switch between — multi-athlete switching is V1
 * (Session 17). This function is the single seam every rounds page and action
 * goes through to answer "whose data is this?", so when the switcher does arrive
 * it changes here and nowhere else.
 *
 * Returns `null` when the user has no athlete row (a parent/coach account, or an
 * account still mid-onboarding). Callers decide what that means for their route.
 */
export async function getActiveAthleteId(
  supabase: SupabaseClient<Database>,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("athletes")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  return data?.id ?? null;
}
