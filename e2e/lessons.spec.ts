import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { LOCAL_SUPABASE_ANON_KEY, LOCAL_SUPABASE_URL } from "./local-supabase";

/**
 * The Lesson Log, proven end-to-end through the real app against the local
 * Supabase stack. What Session 12's Definition of Done insists on:
 *
 *   1. The seeded lessons render, and the summary matches the engine EXACTLY —
 *      four lessons, $360.00 of lesson spend, last lesson Apr 21, 2026.
 *   2. Outstanding homework surfaces on the DASHBOARD as well as on the log, from
 *      one component and one engine call, and it names the coach, the drill, and
 *      the target.
 *   3. "Not answered" is a real state, distinct from "Not yet". The seed's newest
 *      lesson has a null status on purpose and the badge says so.
 *   4. The supersede rule holds end to end: a NEWER lesson clears the older
 *      lesson's homework off the dashboard, and deleting it brings it back. This
 *      is the domain rule the whole feature hangs on.
 *   5. Create / edit / delete work through Zod-validated Server Actions with RLS
 *      the backstop, and a cost typed in dollars lands as integer cents.
 *
 * These sign in as the seeded reference athlete (Sam Rivera). The suite runs
 * serially against one shared auth backend (see playwright.config.ts).
 */

test.use({ viewport: { width: 375, height: 812 } });

const SEED_EMAIL = "athlete@fairway.dev";
const SEED_PASSWORD = "fairway-dev";

/** The seed's newest lesson — the one carrying outstanding homework. */
const SEED_HOMEWORK_LESSON_ON = "2026-04-21";

/** Fixture lessons are tagged by coach name so a failed assertion can never
 * leave a stray row behind to skew the seeded summary the other tests pin. */
const FIXTURE_COACH = "E2E Fixture Coach";

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

test.afterEach(async () => {
  const api = await apiClient();
  await api.from("lessons").delete().ilike("coach_name", `${FIXTURE_COACH}%`);
  // Restore the seeded homework state in case a test marked it done. RLS scopes
  // this to the signed-in athlete's own rows, like every other write here.
  await api
    .from("lessons")
    .update({ homework_done: null })
    .eq("occurred_on", SEED_HOMEWORK_LESSON_ON);
});

test("renders the seeded log, and the summary matches the engine", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/lessons");

  await expect(
    page.getByRole("heading", { name: "Lessons", level: 1 }),
  ).toBeVisible();

  const summary = page.getByRole("region", { name: "Lesson summary" });
  await expect(summary.getByText("4", { exact: true })).toBeVisible();
  // Four lessons at $90 each — lessonSpendCents over the seeded rows.
  await expect(summary.getByText("$360.00")).toBeVisible();
  await expect(summary.getByText("Apr 21, 2026")).toBeVisible();

  // The history, newest first, grouped by year.
  await expect(
    page.getByRole("listitem").filter({ hasText: "2026" }),
  ).not.toHaveCount(0);
  await expect(
    page.getByText("Same tee-ball routine every time"),
  ).toBeVisible();
  await expect(page.getByText("Putter face square at impact")).toBeVisible();
});

test("outstanding homework surfaces on the dashboard and on the log, worded the same", async ({
  page,
}) => {
  await signIn(page);

  for (const url of ["/dashboard", "/lessons"]) {
    await page.goto(url);
    const callout = page.getByRole("region", { name: "Outstanding homework" });
    await expect(callout).toBeVisible();
    await expect(
      callout.getByRole("heading", { name: "Homework from Coach Diaz" }),
    ).toBeVisible();
    // The drill and the target come through verbatim from the row.
    await expect(
      callout.getByText("Three-step routine behind the ball, then commit"),
    ).toBeVisible();
    await expect(
      callout.getByText("Every tee shot for 4 rounds"),
    ).toBeVisible();
    // A null status is "Not answered" — a question, not a failure.
    await expect(callout.getByText("Not answered")).toBeVisible();
    // The sentence asks rather than scolds, and counts no days. (The tone rules
    // are pinned properly over every status in lib/lessons/present.test.ts; this
    // is the composed-screen spot check that the right sentence reached the DOM.
    // Scope it to the sentence, not the whole callout — the athlete's own drill
    // text is theirs to word, and "behind the ball" is golf, not a reprimand.)
    await expect(
      callout.getByText(/haven't said how it's going/),
    ).toBeVisible();
    await expect(callout.getByText(/overdue|days late/i)).toHaveCount(0);
  }

  // The callout links to the lesson it came from.
  await page
    .getByRole("region", { name: "Outstanding homework" })
    .getByRole("link", { name: "Open the lesson" })
    .click();
  await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+$/);
  await expect(
    page.getByRole("heading", { name: "Lesson with Coach Diaz", level: 1 }),
  ).toBeVisible();
});

test("marking the homework done clears it from the dashboard", async ({
  page,
}) => {
  const api = await apiClient();
  const { data: lesson } = await api
    .from("lessons")
    .select("id")
    .eq("occurred_on", SEED_HOMEWORK_LESSON_ON)
    .single();
  const lessonId = lesson?.id as string;

  await signIn(page);
  await page.goto(`/lessons/${lessonId}/edit`);

  await page.getByLabel("Did you get to it?").selectOption("yes");
  await page.getByRole("button", { name: /save changes/i }).click();
  await expect(page).toHaveURL(new RegExp(`/lessons/${lessonId}$`));
  await expect(page.getByText("Done", { exact: true })).toBeVisible();

  // Nothing is owed, so the callout is simply absent — a conditional banner, not
  // a widget with an empty state.
  await page.goto("/dashboard");
  await expect(
    page.getByRole("region", { name: "Outstanding homework" }),
  ).toHaveCount(0);
});

test("a newer lesson supersedes the last one's homework, and removing it restores it", async ({
  page,
}) => {
  const api = await apiClient();

  await signIn(page);
  await page.goto("/lessons/new");

  // A lesson AFTER the one carrying homework. Its own homework is done, so
  // nothing is outstanding once it supersedes the older entry.
  await page.getByLabel("Date").fill("2026-05-04");
  await page.getByLabel("Coach").fill(FIXTURE_COACH);
  await page.getByLabel("Swing key").fill("Quieter lower body");
  await page.getByLabel("Target").fill("Twice a week");
  await page.getByLabel("Did you get to it?").selectOption("yes");
  await page.getByRole("button", { name: /log lesson/i }).click();
  await expect(page).toHaveURL(/\/lessons$/);

  const { data: created } = await api
    .from("lessons")
    .select("id")
    .eq("coach_name", FIXTURE_COACH)
    .single();
  const lessonId = created?.id as string;

  try {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("region", { name: "Outstanding homework" }),
    ).toHaveCount(0);

    // Remove the newer lesson and the April homework is owed again — the rule is
    // "the most recent lesson", evaluated live, not a flag written on a row.
    await page.goto(`/lessons/${lessonId}`);
    await page
      .getByRole("button", { name: /Delete lesson/ })
      .first()
      .click();
    await page
      .getByRole("button", { name: "Delete lesson", exact: true })
      .click();
    await expect(page).toHaveURL(/\/lessons$/);

    await page.goto("/dashboard");
    await expect(
      page
        .getByRole("region", { name: "Outstanding homework" })
        .getByRole("heading", { name: "Homework from Coach Diaz" }),
    ).toBeVisible();
  } finally {
    await api.from("lessons").delete().eq("id", lessonId);
  }
});

test("logs a lesson, storing the cost as integer cents", async ({ page }) => {
  const api = await apiClient();

  await signIn(page);
  await page.goto("/lessons/new");

  // Dated before the seed's newest lesson so this fixture cannot become "the
  // most recent lesson" and disturb the homework the other tests assert.
  await page.getByLabel("Date").fill("2026-02-10");
  await page.getByLabel("Coach").fill(FIXTURE_COACH);
  await page.getByLabel("Swing key").fill("Weight forward through impact");
  await page.getByLabel("Drill assigned").fill("Towel drill, 30 balls");
  await page.getByLabel("Target").fill("Every range session");
  await page.getByLabel("Cost").fill("$125.50");
  await page
    .getByLabel("What changed")
    .fill("Strike moved forward on the face.");
  await page.getByRole("button", { name: /log lesson/i }).click();
  await expect(page).toHaveURL(/\/lessons$/);

  const { data: created } = await api
    .from("lessons")
    .select("id, cost_cents, homework_done, swing_key")
    .eq("coach_name", FIXTURE_COACH)
    .single();

  try {
    // Dollars in, integer cents stored — never a float.
    expect(created?.cost_cents).toBe(12550);
    expect(Number.isInteger(created?.cost_cents)).toBe(true);
    // Unanswered stays unanswered: the app records no verdict the athlete
    // didn't give.
    expect(created?.homework_done).toBeNull();
    expect(created?.swing_key).toBe("Weight forward through impact");

    // And it reads back on the detail page with the cost formatted for humans.
    await page.goto(`/lessons/${created?.id}`);
    await expect(page.getByText("$125.50")).toBeVisible();
    await expect(page.getByText("Towel drill, 30 balls")).toBeVisible();
  } finally {
    await api
      .from("lessons")
      .delete()
      .eq("id", created?.id as string);
  }
});

test("refuses a future date, and a cost that isn't a number", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/lessons/new");

  // A lesson is taken, then logged.
  await page.getByLabel("Date").fill("2099-01-01");
  await page.getByRole("button", { name: /log lesson/i }).click();
  await expect(page.getByText("That date is in the future")).toBeVisible();
  await expect(page).toHaveURL(/\/lessons\/new$/);

  await page.getByLabel("Date").fill("2026-02-10");
  await page.getByLabel("Cost").fill("ninety");
  await page.getByRole("button", { name: /log lesson/i }).click();
  await expect(
    page.getByText("Enter the cost as a number, e.g. 90"),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/lessons\/new$/);
});
