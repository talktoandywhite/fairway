import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { LOCAL_SUPABASE_ANON_KEY, LOCAL_SUPABASE_URL } from "./local-supabase";

/**
 * The Practice Log, proven end-to-end through the real app against the local
 * Supabase stack. What Session 11's Definition of Done insists on:
 *
 *   1. The seeded practice block renders and the rollup matches the engine
 *      EXACTLY — 985 minutes over 15 sessions and 17 segments.
 *   2. A session covers MANY disciplines, each with its own minutes. This is the
 *      shape the whole feature turns on: a 2.5-hour afternoon is one session with
 *      four parts, and each part's minutes are a number the athlete typed, never
 *      a share of a total the app divided up.
 *   3. The ratio check reads the seeded mix against the band for the athlete's
 *      real scoring average (107.25 → the 100s band) and AFFIRMS it. It names its
 *      basis out loud.
 *   4. The window selector narrows the data, and an empty window says so rather
 *      than drawing a chart of zeros.
 *   5. Create / edit / delete work through Zod-validated Server Actions with RLS
 *      the backstop, and minutes round-trip as positive integers.
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
 * assert exactly. Segments cascade with their session.
 */
test.afterEach(async () => {
  const api = await apiClient();
  await api.from("practice_sessions").delete().ilike("notes", "E2E fixture%");
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
  // 985 minutes across 15 day-blocks (17 segments — two days are multi-part).
  await expect(rollup.getByText("16h 25m")).toBeVisible();
  await expect(rollup.getByText("over 15 sessions")).toBeVisible();

  // The table view carries the same figures as the chart (DESIGN.md §3).
  await rollup.getByText("View as table").click();
  const shortGameRow = rollup.getByRole("row", { name: /Short game/ });
  await expect(shortGameRow).toContainText("5h"); // 300 minutes
  await expect(shortGameRow).toContainText("30%"); // of 985
  await expect(rollup.getByRole("row", { name: /On course/ })).toContainText(
    "4h",
  ); // 240 minutes
  // `gym` was renamed to `exercise` in migration 0010 — athlete-facing word.
  await expect(rollup.getByRole("row", { name: /Exercise/ })).toContainText(
    "1h 40m",
  );
});

test("a seeded multi-discipline day reads as one session with its parts", async ({
  page,
}) => {
  await signIn(page);
  await page.goto(ALL_TIME);

  // 2026-04-20 is exercise 50m + putting 30m: one row, not two.
  const row = page
    .getByRole("listitem")
    .filter({ hasText: "Putting · Exercise" })
    .first();
  await expect(row).toBeVisible();
  await expect(row).toContainText("1h 20m"); // 80 minutes, summed
  await expect(row).toContainText("2 parts");

  // The detail page breaks the block back into its disciplines, each with its
  // own minutes and its own detail.
  await row.getByRole("link").first().click();
  await expect(page).toHaveURL(/\/practice\/[0-9a-f-]+$/);
  await expect(
    page.getByRole("heading", { name: "Putting · Exercise", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("across 2 parts")).toBeVisible();
  await expect(page.getByText("50m", { exact: true })).toBeVisible();
  await expect(page.getByText("30m", { exact: true })).toBeVisible();
  await expect(page.getByText("Strength — Block C")).toBeVisible();
  await expect(page.getByText("Distance-only, no hole")).toBeVisible();
});

test("the ratio check reads the seeded mix against the scoring average, and affirms it", async ({
  page,
}) => {
  await signIn(page);
  await page.goto(ALL_TIME);

  const mix = page.getByRole("region", { name: "Your practice mix" });

  // Shares over the MIX (885 min — exercise and lesson are excluded on purpose):
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

  // The excluded minutes are stated, not silently dropped: exercise is 100.
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
  ).toHaveCount(2); // the rollup's empty state and the list's
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

test("logs a four-discipline day as ONE session, each part keeping its own minutes", async ({
  page,
}) => {
  const api = await apiClient();
  const notes = `E2E fixture ${Date.now()}`;

  await signIn(page);
  await page.goto("/practice/new");

  // Nothing is pre-selected: a multi-select shouldn't claim what you did.
  await expect(page.getByText("How long on each?")).toHaveCount(0);

  // The day the user described: exercise, swing, short game, putting.
  for (const discipline of [
    "Exercise",
    "Full swing",
    "Short game",
    "Putting",
  ]) {
    await page.getByRole("button", { name: discipline, exact: true }).click();
  }

  const minutes = {
    Exercise: "45",
    "Full swing": "30",
    "Short game": "45",
    Putting: "30",
  };
  for (const [discipline, value] of Object.entries(minutes)) {
    await page.getByLabel(discipline, { exact: true }).fill(value);
  }

  // The running total is the athlete's check that the block adds up.
  await expect(page.getByText("2h 30m")).toBeVisible();

  await page.getByRole("button", { name: /add detail/i }).click();
  await page.getByLabel("Notes").fill(notes);
  await page.getByRole("button", { name: /log session/i }).click();
  await expect(page).toHaveURL(/\/practice$/);

  const { data: session } = await api
    .from("practice_sessions")
    .select("id, occurred_on, notes")
    .eq("notes", notes)
    .single();
  const sessionId = session?.id as string;

  try {
    // One session, four segments, and every minute is a number that was typed —
    // not 150 divided four ways.
    const { data: segments } = await api
      .from("practice_segments")
      .select("session_type, minutes")
      .eq("practice_session_id", sessionId)
      .order("minutes", { ascending: false });

    expect(segments).toHaveLength(4);
    expect(
      Object.fromEntries(
        (segments ?? []).map((s) => [s.session_type, s.minutes]),
      ),
    ).toEqual({
      exercise: 45,
      range_full_swing: 30,
      short_game: 45,
      putting: 30,
    });

    // And it reads back as one row in the log, not four.
    await page.goto("/practice");
    const row = page
      .getByRole("listitem")
      .filter({ hasText: "Full swing · Short game · Putting · Exercise" })
      .first();
    await expect(row).toContainText("2h 30m");
    await expect(row).toContainText("4 parts");
  } finally {
    await api.from("practice_sessions").delete().eq("id", sessionId);
  }
});

test("editing replaces the session's disciplines, and delete takes the segments with it", async ({
  page,
}) => {
  const api = await apiClient();
  const notes = `E2E fixture ${Date.now()}`;

  await signIn(page);
  await page.goto("/practice/new");
  await page.getByRole("button", { name: "Putting", exact: true }).click();
  await page.getByLabel("Putting", { exact: true }).fill("45");
  await page.getByRole("button", { name: /add detail/i }).click();
  await page.getByLabel("Notes").fill(notes);
  await page.getByRole("button", { name: /log session/i }).click();
  await expect(page).toHaveURL(/\/practice$/);

  const { data: created } = await api
    .from("practice_sessions")
    .select("id")
    .eq("notes", notes)
    .single();
  const sessionId = created?.id as string;

  try {
    // --- Edit: drop putting, add short game, and re-time it ----------------
    await page.goto(`/practice/${sessionId}/edit`);
    await page.getByRole("button", { name: "Putting", exact: true }).click();
    await page.getByRole("button", { name: "Short game", exact: true }).click();
    await page.getByLabel("Short game", { exact: true }).fill("75");
    await page.getByRole("button", { name: /save changes/i }).click();

    await expect(page).toHaveURL(new RegExp(`/practice/${sessionId}$`));
    await expect(
      page.getByRole("heading", { name: "Short game", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText("1h 15m").first()).toBeVisible();

    // The replacement is real: the old discipline is gone, not merely hidden.
    const { data: segments } = await api
      .from("practice_segments")
      .select("session_type, minutes")
      .eq("practice_session_id", sessionId);
    expect(segments).toEqual([{ session_type: "short_game", minutes: 75 }]);

    // --- Delete with confirmation ------------------------------------------
    await page
      .getByRole("button", { name: /Delete practice session/ })
      .first()
      .click();
    await page
      .getByRole("button", { name: "Delete session", exact: true })
      .click();
    await expect(page).toHaveURL(/\/practice$/);

    // The session is gone and its segments cascaded with it — no orphans.
    const { data: afterSessions } = await api
      .from("practice_sessions")
      .select("id")
      .eq("id", sessionId);
    expect(afterSessions).toEqual([]);
    const { data: afterSegments } = await api
      .from("practice_segments")
      .select("id")
      .eq("practice_session_id", sessionId);
    expect(afterSegments).toEqual([]);
  } finally {
    await api.from("practice_sessions").delete().eq("id", sessionId);
  }
});

test("refuses a session with no disciplines, a future date, and a zero-minute part", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/practice/new");

  // Nothing selected: there is no session to log.
  await page.getByRole("button", { name: /log session/i }).click();
  await expect(
    page.getByText("Pick at least one thing you worked on"),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/practice\/new$/);

  await page.getByRole("button", { name: "Putting", exact: true }).click();

  // Practice is done, then logged — a future date is not a thing.
  await page.getByLabel("Date").fill("2099-01-01");
  await page.getByLabel("Putting", { exact: true }).fill("45");
  await page.getByRole("button", { name: /log session/i }).click();
  await expect(page.getByText("That date is in the future")).toBeVisible();

  // A zero-minute part is a discipline you didn't actually work on.
  await page.getByLabel("Date").fill("2026-04-06");
  await page.getByLabel("Putting", { exact: true }).fill("0");
  await page.getByRole("button", { name: /log session/i }).click();
  await expect(page.getByText("Enter at least 1 minute")).toBeVisible();
  await expect(page).toHaveURL(/\/practice\/new$/);
});
