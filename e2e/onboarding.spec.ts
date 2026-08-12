import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { ensureAthleteOnboarding } from "@/lib/auth/onboarding";

import { LOCAL_SUPABASE_ANON_KEY, LOCAL_SUPABASE_URL } from "./local-supabase";

/**
 * Proves the confirmation-aware onboarding fix: an athlete account gets its
 * athlete row and guardian consent request the first time a session exists,
 * even when that session appears *after* sign-up (the email-confirmation path).
 *
 * We can't toggle email confirmation on the shared local stack without breaking
 * the other specs, so we reproduce the exact state that confirmation leaves
 * behind — a confirmed user with a session and signup metadata, but no athlete
 * row yet — by signing up directly through supabase-js (which skips the app's
 * inline onboarding). Then we run ensureAthleteOnboarding, the same function
 * /auth/callback calls, and assert it completes onboarding. This is the seam
 * that used to be skipped when signUp returned no session.
 */

function yearsAgo(years: number): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString().slice(0, 10);
}

test("onboarding completes from a session alone (email-confirmation path)", async () => {
  const stamp = Date.now();
  const childEmail = `confirm.${stamp}@fairway.test`;
  const guardianEmail = `guardian.${stamp}@fairway.test`;
  const password = "confirm-onboarding-1";

  const supabase = createClient(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_ANON_KEY);

  // Reproduce the post-confirmation state: user + profile exist (handle_new_user
  // trigger), a session is active, guardian email is in metadata — but no
  // athlete row, because the app's inline onboarding never ran.
  const { data: signUp, error: signUpError } = await supabase.auth.signUp({
    email: childEmail,
    password,
    options: {
      data: {
        display_name: "Confirm Kid",
        role: "athlete",
        date_of_birth: yearsAgo(9),
        guardian_email: guardianEmail,
      },
    },
  });
  expect(signUpError).toBeNull();
  // Local stack has confirmations off, so signUp yields a session — which is
  // precisely the "session now exists" state confirmation produces remotely.
  expect(signUp.session).toBeTruthy();
  const userId = signUp.user?.id as string;

  // Precondition: no athlete row yet.
  const before = await supabase
    .from("athletes")
    .select("id")
    .eq("user_id", userId);
  expect(before.data).toEqual([]);

  // The fix: onboarding runs off the session alone.
  const result = await ensureAthleteOnboarding(supabase);
  expect(result?.pendingConsent).toBe(true);

  // The athlete row now exists and is frozen pending consent.
  const after = await supabase
    .from("athletes")
    .select("id, consent_status")
    .eq("user_id", userId)
    .single();
  expect(after.data?.consent_status).toBe("pending_consent");

  // And the guardian consent request was created from the metadata email.
  const requests = await supabase
    .from("guardian_consent_requests")
    .select("guardian_email, token")
    .eq("athlete_id", after.data?.id as string);
  expect(requests.data?.length).toBe(1);
  expect(requests.data?.[0]?.guardian_email).toBe(guardianEmail);

  // Idempotent: a second call (e.g. a re-confirmation click) neither throws nor
  // creates a duplicate athlete.
  const again = await ensureAthleteOnboarding(supabase);
  expect(again?.athleteId).toBe(result?.athleteId);
  const count = await supabase
    .from("athletes")
    .select("id")
    .eq("user_id", userId);
  expect(count.data?.length).toBe(1);
});

test("13-or-older onboarding is active with no consent request", async () => {
  const stamp = Date.now();
  const email = `adultconfirm.${stamp}@fairway.test`;
  const supabase = createClient(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_ANON_KEY);

  const { data: signUp } = await supabase.auth.signUp({
    email,
    password: "confirm-onboarding-2",
    options: {
      data: {
        display_name: "Confirm Adult",
        role: "athlete",
        date_of_birth: yearsAgo(20),
      },
    },
  });
  const userId = signUp.user?.id as string;

  const result = await ensureAthleteOnboarding(supabase);
  expect(result?.pendingConsent).toBe(false);

  const after = await supabase
    .from("athletes")
    .select("id, consent_status")
    .eq("user_id", userId)
    .single();
  expect(after.data?.consent_status).toBe("active");

  // No guardian consent request for a 13+ account.
  const requests = await supabase
    .from("guardian_consent_requests")
    .select("id")
    .eq("athlete_id", after.data?.id as string);
  expect(requests.data).toEqual([]);
});
