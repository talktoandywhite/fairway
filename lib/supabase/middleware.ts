import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";

import { supabaseEnv } from "./env";

/**
 * Session refresh + route protection, run from the root `middleware.ts` on
 * every non-asset request.
 *
 * Two jobs:
 *  1. Keep the Supabase auth token fresh (the original Session 3 behaviour).
 *  2. Enforce who may be where — including the COPPA holding pattern: an athlete
 *     whose account is `pending_consent` is pinned to /pending-consent until a
 *     guardian consents. This is UX/defence-in-depth; the data itself is
 *     protected by RLS regardless (a pending account cannot write even if it
 *     reached a page it shouldn't). Belt and braces, on purpose.
 */

// Paths reachable while signed out. Everything else requires a session.
// `/reset-password` is public because the recovery link establishes its own
// session; `/consent` is public because a guardian verifies without an account;
// `/auth` is the code-exchange callback; `/styleguide` is a design reference.
const PUBLIC_PATHS = [
  "/",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/consent",
  "/auth",
  "/styleguide",
];

// Signed-in users have no business on these — send them inward instead.
const AUTH_PAGES = ["/sign-in", "/sign-up", "/forgot-password"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || (p !== "/" && pathname.startsWith(`${p}/`)),
  );
}

export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });
  const { url, anonKey } = supabaseEnv();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // Do not run any logic between creating the client and this call. Touching
  // the user is what triggers the token refresh; anything in between risks a
  // hard-to-debug session that intermittently logs the user out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Carry the freshly-rotated auth cookies onto any redirect we issue — a bare
  // NextResponse.redirect would drop them and desync the session.
  const redirectTo = (
    path: string,
    withRedirectParam = false,
  ): NextResponse => {
    const target = request.nextUrl.clone();
    target.pathname = path;
    target.search = "";
    if (withRedirectParam) target.searchParams.set("redirect", pathname);
    const response = NextResponse.redirect(target);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie);
    });
    return response;
  };

  // Signed out: allow public paths, gate everything else to sign-in.
  if (!user) {
    if (isPublic(pathname)) return supabaseResponse;
    return redirectTo("/sign-in", true);
  }

  // Signed in. We only need the consent status where it changes a decision:
  // deciding where an auth page sends them, or gating a protected route.
  const needsConsentCheck =
    AUTH_PAGES.includes(pathname) || !isPublic(pathname);

  let isPending = false;
  if (needsConsentCheck) {
    const { data: athlete } = await supabase
      .from("athletes")
      .select("consent_status")
      .eq("user_id", user.id)
      .maybeSingle();
    isPending = athlete?.consent_status === "pending_consent";
  }

  // A signed-in user on an auth page goes inward — to the holding screen if
  // their account is still pending, otherwise to the dashboard.
  if (AUTH_PAGES.includes(pathname)) {
    return redirectTo(isPending ? "/pending-consent" : "/dashboard");
  }

  if (isPending) {
    // Frozen account: the only in-app place is the holding screen. Public pages
    // (home, the consent landing, the auth callback) stay reachable.
    if (pathname !== "/pending-consent" && !isPublic(pathname)) {
      return redirectTo("/pending-consent");
    }
  } else if (pathname === "/pending-consent") {
    // Active account has nothing to wait for.
    return redirectTo("/dashboard");
  }

  return supabaseResponse;
}
