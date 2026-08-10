import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

import { supabaseEnv } from "./env";

/**
 * Supabase client for use in Client Components. The anon key is public; RLS is
 * the authorization layer (see CLAUDE.md). Never reach for the service role
 * here — there is no service-role query path in user-facing code.
 */
export function createClient() {
  const { url, anonKey } = supabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}
