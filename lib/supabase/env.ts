/**
 * Reads and validates the Supabase environment variables shared by all three
 * clients (browser, server, middleware).
 *
 * The `process.env.NEXT_PUBLIC_*` accesses are written as static member
 * expressions on purpose: Next.js only inlines public env vars into the
 * browser bundle when they are referenced statically, not via a dynamic key.
 * Returning narrowed `string` values also lets callers avoid the non-null
 * assertion that the lint config forbids.
 */
export function supabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL " +
        "and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see .env.example).",
    );
  }

  return { url, anonKey };
}
