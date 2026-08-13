import { expect, test, type Page } from "@playwright/test";

/**
 * The dashboard — the "am I getting there?" screen — proven end to end against
 * the local Supabase stack as the seeded reference athlete (Sam Rivera). The
 * Session 9 Definition of Done: the dashboard matches the workbook's numbers
 * exactly. Those numbers are the same oracle the stats engine is locked to
 * (lib/stats/__tests__/seed-oracle.test.ts) — scoring average 107.25, strokes
 * to goal 7.25 against the 100 goal, penalties 4.83 and three-putts 3.5 per
 * round, and the 126-day off-season gap. If any drift, the app is no longer the
 * spreadsheet it replaces.
 *
 * The date-relative widgets (next event, phase) are asserted more loosely than
 * the derived numbers: they legitimately depend on the run date, while the
 * scoring/leak/gap figures do not.
 */

test.use({ viewport: { width: 375, height: 812 } });

const SEED_EMAIL = "athlete@fairway.dev";
const SEED_PASSWORD = "fairway-dev";

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(SEED_EMAIL);
  await page.getByLabel("Password").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("lands on the dashboard after sign-in and shows the workbook's headline numbers", async ({
  page,
}) => {
  await signIn(page);

  // Above the fold: the single headline number and its goal context.
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("107.25", { exact: true })).toBeVisible();
  await expect(page.getByText("7.25", { exact: true })).toBeVisible();
  await expect(page.getByText(/to your 100 goal/)).toBeVisible();

  // The season trend is genuinely improving (negative slope).
  await expect(page.getByText("Improving")).toBeVisible();

  // Exactly one primary "am I getting there" card on the screen.
  await expect(page.locator(".metric-card-primary")).toHaveCount(1);
});

test("the leak breakdown shows each leak's live per-round average against target", async ({
  page,
}) => {
  await signIn(page);

  const leaks = page.getByRole("region", { name: "Leak breakdown" });
  await expect(
    leaks.getByRole("heading", { name: "Leak breakdown" }),
  ).toBeVisible();

  // The two measured leaks, from averagePerRound over the tournament rounds.
  await expect(leaks.getByText("4.83", { exact: true })).toBeVisible(); // penalties
  await expect(leaks.getByText("3.5", { exact: true })).toBeVisible(); // three-putts
});

test("the score trend chart renders with a table view of the same rounds", async ({
  page,
}) => {
  await signIn(page);

  const trend = page.getByRole("region", { name: "Score trend" });
  await expect(
    trend.getByRole("heading", { name: "Score trend" }),
  ).toBeVisible();

  // Every chart has a table view (DESIGN.md §3): open it and confirm the
  // opening 116 and the closing 100 are both present.
  await trend.getByText("View as table").click();
  await expect(trend.getByRole("table")).toBeVisible();
  await expect(
    trend.getByRole("cell", { name: "116", exact: true }),
  ).toBeVisible();
  await expect(
    trend.getByRole("cell", { name: "100", exact: true }),
  ).toBeVisible();
});

test("the gap warning fires for the 126-day off-season, and schedule widgets render", async ({
  page,
}) => {
  await signIn(page);

  // longestGap = 126 (2026-05-02 → 2026-09-05), over the 60-day limit.
  await expect(page.getByText(/126 days/)).toBeVisible();

  // The date-relative widgets are present; assert headings, not counts.
  await expect(
    page.getByRole("region", { name: "Training phase" }),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "Next event" })).toBeVisible();
});
