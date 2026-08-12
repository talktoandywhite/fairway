"use server";

import { redirect } from "next/navigation";

import { ensureAthleteOnboarding } from "@/lib/auth/onboarding";
import { sendGuardianConsentEmail } from "@/lib/consent/email";
import {
  guardianEmailSchema,
  isUnderCoppaAge,
  magicLinkSchema,
  resetRequestSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from "@/lib/schemas/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Actions for every auth + guardian-consent flow. Each one re-parses its
 * input with the shared Zod schema before touching Supabase — the client is
 * never trusted, even though RLS is also enforcing the rules (CLAUDE.md).
 *
 * They take a single `FormData` so they can be called from the React Hook Form
 * `onSubmit` handlers and would also work as a bare `<form action>` fallback.
 * The returned shape is small: a top-level `error` for form-wide failures,
 * `fieldErrors` keyed by the same field names the Zod schema uses, and
 * `message` for success notices on flows that stay on the page. Flows that end
 * in navigation call `redirect()`, which throws and so never returns a state.
 */
export type AuthActionState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  message?: string;
};

const GENERIC_ERROR = "Something went wrong. Please try again.";

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/** Narrow a redirect target to a same-origin path so `?redirect=` can't be an open redirect. */
function safeNext(value: FormDataEntryValue | null, fallback: string): string {
  if (typeof value !== "string") return fallback;
  // Must be an absolute path, and not a protocol-relative `//host` escape.
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

// --------------------------------------------------------------------------
// Sign up — the flow that collects date of birth and arms the consent gate
// --------------------------------------------------------------------------

export async function signUpAction(
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    dateOfBirth: formData.get("dateOfBirth"),
    guardianEmail: formData.get("guardianEmail") ?? undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { displayName, email, password, dateOfBirth, guardianEmail } =
    parsed.data;
  const supabase = await createClient();

  // The birth date and guardian email ride along as signup metadata. The
  // handle_new_user trigger (0002) writes the birth date onto profiles; the
  // guardian email is carried so onboarding can still create the consent request
  // if the session only appears later, after an email confirmation. Storing it
  // here is not a new disclosure — it is the same address that lands in
  // guardian_consent_requests, entered by the athlete themselves.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        role: "athlete",
        date_of_birth: dateOfBirth,
        guardian_email: guardianEmail ?? null,
      },
      emailRedirectTo: `${siteUrl()}/auth/callback`,
    },
  });

  if (error) {
    // Supabase returns "User already registered" for a taken email.
    return { error: error.message };
  }

  // Email confirmation is ON: there is no session yet. The account, its profile,
  // and the guardian email (in metadata) all exist; onboarding is finished later
  // from /auth/callback once the user confirms. Tell them what to do next.
  if (!data.session) {
    return {
      message:
        "Check your email to confirm your account — your setup finishes automatically once you do.",
    };
  }

  // Email confirmation is OFF: a session exists now, so finish onboarding inline.
  // ensureAthleteOnboarding creates the athlete row and, for an under-13 account,
  // the guardian consent request — the same step /auth/callback runs on the
  // confirmation path.
  await ensureAthleteOnboarding(supabase);

  if (isUnderCoppaAge(dateOfBirth)) {
    redirect("/pending-consent");
  }

  redirect(safeNext(formData.get("redirect"), "/dashboard"));
}

// --------------------------------------------------------------------------
// Sign in — email + password
// --------------------------------------------------------------------------

export async function signInAction(
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Do not disclose whether the email exists — one message for both cases.
    return { error: "Wrong email or password." };
  }

  // Middleware re-checks consent on every request, so a pending account sent to
  // /dashboard is bounced to /pending-consent. We still default to /dashboard
  // and honour a same-origin ?redirect target.
  redirect(safeNext(formData.get("redirect"), "/dashboard"));
}

// --------------------------------------------------------------------------
// Magic link — passwordless sign-in for existing accounts only
// --------------------------------------------------------------------------

export async function magicLinkAction(
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = magicLinkSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      // Never create an account via magic link: a link-created user would have
      // no date of birth and so bypass the consent gate. Sign-up is the only
      // path that collects a birth date.
      shouldCreateUser: false,
      emailRedirectTo: `${siteUrl()}/auth/callback`,
    },
  });

  if (error) return { error: error.message };

  // Same wording whether or not the email exists, to avoid account enumeration.
  return {
    message: "If that email has an account, a sign-in link is on its way.",
  };
}

// --------------------------------------------------------------------------
// Password reset — request, then set a new one from the recovery session
// --------------------------------------------------------------------------

export async function requestPasswordResetAction(
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${siteUrl()}/auth/callback?next=/reset-password` },
  );

  if (error) return { error: error.message };

  return {
    message: "If that email has an account, a reset link is on its way.",
  };
}

export async function updatePasswordAction(
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();

  // updateUser requires a live session. The recovery link establishes one via
  // /auth/callback; without it there is nothing to update.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: "Your reset link has expired. Request a new one and try again.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { error: error.message };

  redirect("/dashboard");
}

// --------------------------------------------------------------------------
// Sign out
// --------------------------------------------------------------------------

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

// --------------------------------------------------------------------------
// Guardian consent — resend the email, and verify a token
// --------------------------------------------------------------------------

export async function resendGuardianConsentAction(
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = guardianEmailSchema.safeParse({
    guardianEmail: formData.get("guardianEmail"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: athlete } = await supabase
    .from("athletes")
    .select("id, consent_status")
    .eq("user_id", user.id)
    .single();

  if (!athlete) return { error: GENERIC_ERROR };
  if (athlete.consent_status === "active") {
    // Already consented — nothing to resend. Middleware will move them on.
    redirect("/dashboard");
  }

  const { data: request, error } = await supabase
    .from("guardian_consent_requests")
    .insert({
      athlete_id: athlete.id,
      guardian_email: parsed.data.guardianEmail,
    })
    .select("token")
    .single();

  if (error || !request) return { error: GENERIC_ERROR };

  await sendGuardianConsentEmail({
    to: parsed.data.guardianEmail,
    athleteName: user.email ?? "your athlete",
    token: request.token,
  });

  return {
    message: `We've sent a new consent link to ${parsed.data.guardianEmail}.`,
  };
}

export async function verifyGuardianConsentAction(
  formData: FormData,
): Promise<AuthActionState> {
  const token = formData.get("token");
  if (typeof token !== "string" || token.length === 0) {
    return { error: "This consent link is missing its token." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_guardian_consent", {
    consent_token: token,
  });

  if (error || !data) {
    return {
      error:
        "This consent link is invalid or has already been used. Ask the athlete to resend it.",
    };
  }

  return {
    message: "Consent confirmed. This athlete's account is now active.",
  };
}
