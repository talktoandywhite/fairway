import type { SupabaseClient } from "@supabase/supabase-js";

import { sendGuardianConsentEmail } from "@/lib/consent/email";
import type { Database } from "@/types/database";

/**
 * Create the athlete row — and, for an under-13 account, the guardian consent
 * request — for the signed-in user, exactly once.
 *
 * This is the seam that makes onboarding independent of *when* the first session
 * appears. With email confirmation OFF, `signUp` returns a session immediately
 * and this runs inline from the sign-up action. With email confirmation ON,
 * `signUp` returns no session and this instead runs from `/auth/callback` after
 * the user clicks the confirmation link. Either way the consent gate is armed
 * the first time a real session exists — it can never be skipped just because
 * the timing of the session changed (the bug this fixes).
 *
 * Idempotent: an already-onboarded athlete (a returning user via magic link, a
 * double-submit, a second confirmation click) short-circuits on the existing
 * row, and the `unique (user_id)` constraint on `athletes` is the final backstop
 * against a duplicate.
 *
 * Takes the caller's Supabase client so it runs as the user under RLS (no
 * service role — CLAUDE.md) and so it is testable with a plain supabase-js
 * session. It reads what it needs from the user's signup metadata: the guardian
 * email is carried there specifically so it survives the gap between sign-up and
 * a later email confirmation.
 */
export async function ensureAthleteOnboarding(
  supabase: SupabaseClient<Database>,
): Promise<{ athleteId: string; pendingConsent: boolean } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Only athlete accounts own an athlete row; parents and coaches reach an
  // athlete through athlete_links, never by owning a row (CLAUDE.md). The role
  // is recorded in signup metadata.
  const role = (user.user_metadata?.role as string | undefined) ?? "athlete";
  if (role !== "athlete") return null;

  // Already onboarded — nothing to do.
  const existing = await supabase
    .from("athletes")
    .select("id, consent_status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing.data) {
    return {
      athleteId: existing.data.id,
      pendingConsent: existing.data.consent_status === "pending_consent",
    };
  }

  // Create the athlete. The BEFORE INSERT trigger (0004) stamps consent_status
  // from the profile's date_of_birth — active for 13+, pending_consent for
  // under-13 — so we never set it here.
  //
  // Deliberately a plain insert with NO `.select()`: an `INSERT ... RETURNING`
  // on athletes is rejected by RLS (the account's own BEFORE INSERT trigger and
  // the SELECT policy don't compose under RETURNING), so we insert, then read
  // the row back separately — the same two-step the original signup used.
  const inserted = await supabase.from("athletes").insert({ user_id: user.id });
  if (inserted.error) {
    // A unique-user_id violation means a concurrent onboarding already created
    // the row; adopt it and let that winner own the consent request. Any other
    // error is real.
    const raced = await supabase
      .from("athletes")
      .select("id, consent_status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (raced.data) {
      return {
        athleteId: raced.data.id,
        pendingConsent: raced.data.consent_status === "pending_consent",
      };
    }
    return null;
  }

  const created = await supabase
    .from("athletes")
    .select("id, consent_status")
    .eq("user_id", user.id)
    .single();
  if (created.error || !created.data) return null;

  const pendingConsent = created.data.consent_status === "pending_consent";

  // Under-13: record the guardian consent request from the address collected at
  // sign-up (carried in metadata to survive the confirmation gap) and send the
  // link. The account is already frozen by RLS; this is what will unfreeze it.
  if (pendingConsent) {
    const guardianEmail =
      (user.user_metadata?.guardian_email as string | undefined) ?? "";
    if (guardianEmail) {
      const request = await supabase
        .from("guardian_consent_requests")
        .insert({ athlete_id: created.data.id, guardian_email: guardianEmail })
        .select("token")
        .single();
      if (request.data) {
        const athleteName =
          (user.user_metadata?.display_name as string | undefined) ??
          "your athlete";
        await sendGuardianConsentEmail({
          to: guardianEmail,
          athleteName,
          token: request.data.token,
        });
      }
    }
  }

  return { athleteId: created.data.id, pendingConsent };
}
