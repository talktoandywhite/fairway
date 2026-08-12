/**
 * Connection details for the LOCAL Supabase stack, used by the e2e suite.
 *
 * These are the Supabase CLI's fixed local-development values — the same on
 * every machine that runs `supabase start`, published in Supabase's own docs.
 * They are not secrets and are safe to commit; they only ever address the
 * throwaway local stack, never a real project. The e2e run points the Next app
 * at this stack (see playwright.config.ts) so it exercises the migrations and
 * RLS policies in this branch, not a remote database.
 */
export const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";

export const LOCAL_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

/** The origin the app is served on during the e2e run. */
export const APP_ORIGIN = "http://127.0.0.1:3000";
