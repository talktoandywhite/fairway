import { NextResponse } from "next/server";

import { ensureAthleteOnboarding } from "@/lib/auth/onboarding";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth/OTP callback. Magic-link sign-in and the password-recovery link both
 * land here with a `code` that must be exchanged for a session cookie before
 * the user can be treated as signed in. `next` lets the recovery flow continue
 * to /reset-password; it is narrowed to a same-origin path so the callback
 * can't be turned into an open redirect.
 *
 * This route lives outside the (auth)/(app) groups on purpose: it renders no
 * UI, it only sets cookies and redirects.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // A just-confirmed signup now has its first session but no athlete row
      // yet — finish onboarding here so the consent gate is armed even when
      // email confirmation is enabled. Idempotent for anyone already onboarded
      // (magic link, a second click), so it is safe on every callback.
      await ensureAthleteOnboarding(supabase);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=link_expired`);
}
