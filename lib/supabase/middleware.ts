import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";

import { supabaseEnv } from "./env";

/**
 * Refreshes the Supabase auth session on every request and propagates the
 * rotated cookies onto the response. Called from the root `middleware.ts`.
 *
 * Route protection and the pending-consent gate are deliberately NOT here yet
 * — they arrive with the auth flows in Session 5. This helper does one job:
 * keep the session token fresh so Server Components see an authenticated user.
 */
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
  await supabase.auth.getUser();

  return supabaseResponse;
}
