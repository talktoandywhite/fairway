import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { LOCAL_SUPABASE_ANON_KEY, LOCAL_SUPABASE_URL } from "./local-supabase";

/**
 * The Practice Log, proven end-to-end through the real app against the local
 * Supabase stack. What Session 11's Definition of Done insists on:
 *
 *   1. The seeded practice block renders, and the rollup matches the engine
 *      EXACTLY — 985 minutes over 17 sessions, short game 5h, on course 4h.
 *   2. The ratio check reads the seeded mix against the band for the athlete's
 *      real scoring average (107.25 → the 100s band) and AFFIRMS it, because the
 *      seeded mix is genuinely short-game heavy. It names its basis out loud.
 *   3. The window selector actually narrows the data, and an empty window says so
 *      rather than showing a chart of zeros.
 *   4. Create / edit / delete work through Zod-validated Server Actions, with RLS
 *      the backstop, and minutes round-trip as a positive integer.
 *
 * These sign in as the seeded reference athlete (Sam Rivera). The suite runs
 * serially against one shared auth backend (see playwright.config.ts).
 */

// A phone in a parking lot — this is the screen that most needs to survive it.
test.use({ viewport: { width: 375, height: 812 } });

const SEED_EMAIL = "athlete@fairway.dev";
const SEED_PASSWORD = "fairway-dev";

/** The seeded practice block is April 2026, so only the all-time window shows it. */
const ALL_TIME = "/practice?window=all";

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(SEED_EMAIL);
  await page.getByLabel("Password").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function apiClient() {
  const api = createClient(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_ANON_KEY);
  const { error } = await api.auth.signInWithPassword({
    email: SEED_EMAIL,
    password: SEED_PASSWORD,
  });
  expect(error).toBeNull();
  return api;
}

/**
 * Sweep any throwaway rows this suite creates, so a failed assertion mid-test can
 * never leave a stray session behind to skew the seeded rollup the other tests
 * assert exactly. The focus text is the one the create test uses.
 */
test.afterEach(async () => {
  const api = await apiClient();
  await api.from("practice_sessions").delete().ilike("focus", "E2E fixture%");
});

test("renders the seeded rollup, and the numbers match the engine", async ({
  page,
}) => {
  await signIn(page);
  await page.goto(ALL_TIME);

  await expect(
    page.getByRole("heading", { name: "Practice", level: 1 }),
  ).toBeVisible();

  const rollup = page.getByRole("region", { name: "Minutes by type" });
  // 985 minutes over the 17 seeded sessions — the engine's minutesByType total.
  await expect(rollup.getByText("16h 25m")).toBeVisible();
  await expect(rollup.getByText("over 17 sessions")).toBeVisible();

  // The table view carries the same figures as the chart (DESIGN.md §3).
  await rollup.getByText("View as table").click();
  const shortGameRow = rollup.getByRole("row", { name: /Short game/ });
  await expect(shortGameRow).toContainText("5h"); // 300 minutes
  await expect(shortGameRow).toContainText("30%"); // of 985
  await expect(rollup.getByRole("row", { name: /On course/ })).toContainText(
    "4h",
  ); // 240 minutes
  await expect(rollup.getByRole("row", { name: /Gym/ })).toContainText(
    "1h 40m",
  );
});

test("the ratio check reads the seeded mix against the scoring average, and affirms it", async ({
  page,
}) => {
  await signIn(page);
  await page.goto(ALL_TIME);

  const mix = page.getByRole("region", { name: "Your practice mix" });

  // Shares over the MIX (885 min — gym and lesson are excluded on purpose):
  // scoring 540 = 61%, full swing 105 = 12%, on course 240 = 27%.
  await expect(mix.getByText("61%", { exact: true })).toBeVisible();
  await expect(mix.getByText("12%", { exact: true })).toBeVisible();
  await expect(mix.getByText("27%", { exact: true })).toBeVisible();

  // 107.25 puts this athlete in the 100s band, where all three land in range —
  // so the check affirms rather than nagging.
  await expect(mix.getByText(/right where it should be/i)).toBeVisible();
  await expect(mix.getByText(/scoring in the 100s/).first()).toBeVisible();
  await expect(mix.getByText("107.25")).toBeVisible();
  await expect(mix.getByText("In range")).toHaveCount(3);

  // The excluded minutes are stated, not silently dropped: gym is 100 minutes.
  await expect(mix.getByText(/1h 40m/)).toBeVisible();
  await expect(mix.getByText(/not in this mix/i)).toBeVisible();
});

test("the window selector narrows the data, and an empty window says so", async ({
  page,
}) => {
  await signIn(page);

  // The seeded sessions are months old, so the default 30-day window is empty —
  // and empty means an explanation, never a chart of zeros.
  await page.goto("/practice");
  await expect(
    page.getByText(/Nothing logged in the last 30 days/i),
  ).toHaveCount(
    2, // the rollup's empty state and the list's
  );
  await expect(
    page.getByRole("region", { name: "Minutes by type" }),
  ).toHaveCount(0);

  // Widening to all time brings the seeded block back. This is the regression
  // test for the window tabs being plain anchors: as `next/link`, this click was
  // measured dropping silently — no URL change, no transition — on most runs.
  await page.getByRole("link", { name: "All time" }).click();
  await expect(page).toHaveURL(/window=all/);
  await expect(
    page.getByRole("region", { name: "Minutes by type" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "All time" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("log, edit, and delete a session; minutes round-trip as a positive integer", async ({
  page,
}) => {
  const api = await apiClient();
  const focus = `E2E fixture ${Date.now()}`;

  await signIn(page);

  // --- Log ----------------------------------------------------------------
  await page.goto("/practice/new");
  await page.getByRole("button", { name: "Putting", exact: true }).click();
  await page.getByRole("button", { name: "45m", exact: true }).click();

  // The disclosure genuinely collapses. Worth asserting: a `hidden` attribute on
  // an element that also carries a `flex` utility is a silent no-op, because the
  // two have equal specificity and utilities are emitted last (see the note in
  // practice-form.tsx). Without this the "60-second core" would not be a core.
  await expect(page.getByLabel("Focus")).toBeHidden();
  await page.getByRole("button", { name: /add detail/i }).click();
  await expect(page.getByLabel("Focus")).toBeVisible();

  await page.getByLabel("Focus").fill(focus);
  await page.getByLabel("Drill").fill("Gate drill from 4 ft");
  await page.getByRole("button", { name: /log session/i }).click();

  await expect(page).toHaveURL(/\/practice$/);

  const { data: created } = await api
    .from("practice_sessions")
    .select("*")
    .eq("focus", focus)
    .single();
  expect(created?.minutes).toBe(45);
  expect(created?.session_type).toBe("putting");
  expect(created?.drill).toBe("Gate drill from 4 ft");
  // An untouched optional field is null, never an empty string.
  expect(created?.result).toBeNull();

  const sessionId = created?.id as string;

  try {
    // --- Edit -------------------------------------------------------------
    await page.goto(`/practice/${sessionId}/edit`);
    await page.getByLabel("How long?").fill("75");
    await page.getByLabel("Result").fill("Made 18 of 20 from 4 ft");
    await page.getByRole("button", { name: /save changes/i }).click();

    await expect(page).toHaveURL(new RegExp(`/practice/${sessionId}$`));
    // Exact: the delete dialog's confirmation prose names the same duration.
    await expect(page.getByText("1h 15m", { exact: true })).toBeVisible();
    await expect(page.getByText("Made 18 of 20 from 4 ft")).toBeVisible();

    const { data: edited } = await api
      .from("practice_sessions")
      .select("minutes, result")
      .eq("id", sessionId)
      .single();
    expect(edited?.minutes).toBe(75);

    // --- Delete with confirmation ------------------------------------------
    await page
      .getByRole("button", { name: /Delete practice session/ })
      .first()
      .click();
    await page
      .getByRole("button", { name: "Delete session", exact: true })
      .click();
    await expect(page).toHaveURL(/\/practice$/);

    const { data: afterDelete } = await api
      .from("practice_sessions")
      .select("id")
      .eq("id", sessionId);
    expect(afterDelete).toEqual([]);
  } finally {
    await api.from("practice_sessions").delete().eq("id", sessionId);
  }
});

test("refuses a future date and a zero-minute session", async ({ page }) => {
  await signIn(page);
  await page.goto("/practice/new");

  // Practice is done, then logged — a future date is not a thing.
  await page.getByLabel("Date").fill("2099-01-01");
  await page.getByLabel("How long?").fill("45");
  await page.getByRole("button", { name: /log session/i }).click();
  await expect(page.getByText("That date is in the future")).toBeVisible();
  await expect(page).toHaveURL(/\/practice\/new$/);

  // A zero-minute session would dilute the rollup with a row that means nothing.
  await page.getByLabel("Date").fill("2026-04-06");
  await page.getByLabel("How long?").fill("0");
  await page.getByRole("button", { name: /log session/i }).click();
  await expect(page.getByText("Enter at least 1 minute")).toBeVisible();
  await expect(page).toHaveURL(/\/practice\/new$/);
});
