import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";

import { supabaseEnv } from "./env";

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 * Reads and writes the auth cookies through Next's cookie store so the session
 * stays in sync. RLS remains the authorization layer — this client runs as the
 * signed-in user, never the service role.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = supabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // `setAll` was called from a Server Component, where cookies are
          // read-only. Safe to ignore: the middleware refreshes the session
          // on every request, so the cookies are written there instead.
        }
      },
    },
  });
}
