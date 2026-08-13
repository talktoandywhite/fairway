import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { LOCAL_SUPABASE_ANON_KEY, LOCAL_SUPABASE_URL } from "./local-supabase";

/**
 * The Score Log, proven end-to-end through the real app against the local
 * Supabase stack. Two things Session 8's Definition of Done insists on:
 *
 *   1. A full 18-hole tournament round WITH detail stats can be logged in under
 *      60 seconds on a 375px viewport (the parking-lot promise).
 *   2. An un-entered detail field persists as `null`, never `0` — verified by
 *      reading the row straight back from the database. A recorded `0` is proven
 *      distinct from a `null` in the same round.
 *
 * Then the list / detail / edit / delete lifecycle.
 *
 * These sign in as the seeded reference athlete (Sam Rivera). The suite runs
 * serially against one shared auth backend (see playwright.config.ts).
 */

// A phone in a parking lot — every round test runs at 375px.
test.use({ viewport: { width: 375, height: 812 } });

const SEED_EMAIL = "athlete@fairway.dev";
const SEED_PASSWORD = "fairway-dev";

/** Sign in through the real UI and land in the app. */
async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(SEED_EMAIL);
  await page.getByLabel("Password").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** A supabase-js client signed in as the seed athlete, for reading rows back. */
async function apiClient() {
  const api = createClient(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_ANON_KEY);
  const { error } = await api.auth.signInWithPassword({
    email: SEED_EMAIL,
    password: SEED_PASSWORD,
  });
  expect(error).toBeNull();
  return api;
}

test("logs an 18-hole tournament round with detail in under 60s; blanks persist as null, a recorded 0 as 0", async ({
  page,
}) => {
  const api = await apiClient();
  const course = `Timed Test GC ${Date.now()}`;

  await signIn(page);
  await page.goto("/rounds/new");
  await expect(
    page.getByRole("heading", { name: "Log a round" }),
  ).toBeVisible();

  // --- The clock starts when the athlete reaches the form -----------------
  const started = Date.now();

  // Required core. Date defaults to today, type to Tournament, holes to 18, par
  // to 72 — so a full tournament round needs only the course and the score.
  await page.getByLabel("Course").fill(course);
  await page.getByLabel("Score", { exact: true }).fill("101");

  // Detail: open the disclosure and record three leak stats. Leave the rest
  // blank on purpose — they must land as null, not 0.
  await page.getByRole("button", { name: /add detail/i }).click();

  // Penalty strokes: tap + once to record a real ZERO (a clean round). This is
  // the null-vs-zero distinction exercised at the UI edge. `exact` keeps the
  // field label off the ± buttons, which share its name.
  await page.getByRole("button", { name: "Increase penalty strokes" }).click();
  await page.getByLabel("Three-putts", { exact: true }).fill("2");
  await page.getByLabel("Total putts", { exact: true }).fill("31");
  // up_and_downs, doubles_or_worse, GIR, fairways: intentionally untouched.

  await page.getByRole("button", { name: /log round/i }).click();

  // Back on the list with the new round visible.
  await expect(page).toHaveURL(/\/rounds$/);
  await expect(
    page.getByRole("link", { name: new RegExp(course) }),
  ).toBeVisible();

  const elapsedMs = Date.now() - started;
  expect(elapsedMs).toBeLessThan(60_000);

  // --- The row, read straight from the database ---------------------------
  const { data: round } = await api
    .from("rounds")
    .select("*")
    .eq("course", course)
    .single();

  expect(round).toBeTruthy();
  expect(round?.round_type).toBe("tournament");
  expect(round?.holes).toBe(18);
  expect(round?.par).toBe(72);
  expect(round?.score).toBe(101);

  // The heart of the session: a recorded 0 is 0, an un-entered field is null.
  expect(round?.penalty_strokes).toBe(0); // recorded clean round
  expect(round?.three_putts).toBe(2);
  expect(round?.total_putts).toBe(31);
  expect(round?.up_and_downs).toBeNull(); // never touched → not recorded
  expect(round?.doubles_or_worse).toBeNull();
  expect(round?.greens_in_regulation).toBeNull();
  expect(round?.fairways_hit).toBeNull();
  expect(round?.fairways_possible).toBeNull();

  // Cleanup so re-runs stay clean.
  await api
    .from("rounds")
    .delete()
    .eq("id", round?.id as string);
});

test("required-only round stores every detail field as null", async ({
  page,
}) => {
  const api = await apiClient();
  const course = `Minimal GC ${Date.now()}`;

  await signIn(page);
  await page.goto("/rounds/new");

  await page.getByLabel("Course").fill(course);
  await page.getByLabel("Round type").selectOption("practice_round");
  await page.getByLabel("Score", { exact: true }).fill("94");
  // Detail disclosure never opened — nothing recorded.
  await page.getByRole("button", { name: /log round/i }).click();

  await expect(page).toHaveURL(/\/rounds$/);

  const { data: round } = await api
    .from("rounds")
    .select("*")
    .eq("course", course)
    .single();

  for (const field of [
    "penalty_strokes",
    "three_putts",
    "total_putts",
    "fairways_hit",
    "fairways_possible",
    "greens_in_regulation",
    "up_and_downs",
    "doubles_or_worse",
    "notes",
  ] as const) {
    expect(round?.[field], `${field} should be null`).toBeNull();
  }

  await api
    .from("rounds")
    .delete()
    .eq("id", round?.id as string);
});

test("list filter, detail, edit, and delete", async ({ page }) => {
  const api = await apiClient();
  const course = `Lifecycle GC ${Date.now()}`;

  await signIn(page);

  // --- Create via the form ------------------------------------------------
  await page.goto("/rounds/new");
  await page.getByLabel("Course").fill(course);
  await page.getByLabel("Score", { exact: true }).fill("88");
  await page.getByRole("button", { name: /log round/i }).click();
  await expect(page).toHaveURL(/\/rounds$/);

  // --- Filter: Tournament shows it, Nine-hole (if present) hides it --------
  await page.getByRole("button", { name: /^Tournament/ }).click();
  await expect(
    page.getByRole("link", { name: new RegExp(course) }),
  ).toBeVisible();

  // --- Detail view --------------------------------------------------------
  await page.getByRole("link", { name: new RegExp(course) }).click();
  await expect(page).toHaveURL(/\/rounds\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: course })).toBeVisible();
  // A blank detail field reads "Not recorded", never 0.
  await expect(page.getByText("Not recorded").first()).toBeVisible();

  // --- Edit ---------------------------------------------------------------
  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page).toHaveURL(/\/edit$/);
  const scoreField = page.getByLabel("Score", { exact: true });
  await scoreField.fill("85");
  await page.getByRole("button", { name: /save changes/i }).click();
  await expect(page).toHaveURL(/\/rounds\/[0-9a-f-]+$/);
  await expect(page.getByText("85", { exact: true })).toBeVisible();

  const { data: edited } = await api
    .from("rounds")
    .select("score")
    .eq("course", course)
    .single();
  expect(edited?.score).toBe(85);

  // --- Delete with confirmation ------------------------------------------
  await page
    .getByRole("button", { name: new RegExp(`Delete round at ${course}`) })
    .click();
  await page.getByRole("button", { name: "Delete round", exact: true }).click();
  await expect(page).toHaveURL(/\/rounds$/);
  await expect(
    page.getByRole("link", { name: new RegExp(course) }),
  ).toHaveCount(0);

  // Gone from the database too.
  const { data: afterDelete } = await api
    .from("rounds")
    .select("id")
    .eq("course", course);
  expect(afterDelete).toEqual([]);
});
