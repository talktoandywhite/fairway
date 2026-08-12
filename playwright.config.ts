import { defineConfig, devices } from "@playwright/test";

import {
  APP_ORIGIN,
  LOCAL_SUPABASE_ANON_KEY,
  LOCAL_SUPABASE_URL,
} from "./e2e/local-supabase";

const PORT = 3000;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Serial, single-worker: every spec drives the one shared Supabase auth
  // backend and creates real users, so parallel signups race (and would brush
  // GoTrue's per-IP rate limits). Auth flows are inherently stateful — run them
  // one at a time.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Build once, then serve — closer to production and avoids dev-only flakiness.
  // The app is pointed at the LOCAL Supabase stack (which has this branch's
  // migrations and RLS), not whatever `.env.local` targets for day-to-day dev.
  // NEXT_PUBLIC_* values are inlined at build time, so they must be set for the
  // build step too — hence setting them on the combined build+start command.
  // Next.js does not override variables already present in the environment, so
  // these win over `.env.local`.
  webServer: {
    command: "pnpm build && pnpm start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      ...(process.env as Record<string, string>),
      NEXT_PUBLIC_SUPABASE_URL: LOCAL_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: LOCAL_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_SITE_URL: APP_ORIGIN,
    },
  },
});
