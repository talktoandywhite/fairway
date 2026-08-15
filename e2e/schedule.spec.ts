import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { LOCAL_SUPABASE_ANON_KEY, LOCAL_SUPABASE_URL } from "./local-supabase";

/**
 * The Tournament Plan, proven end-to-end through the real app against the local
 * Supabase stack. Four things Session 10's Definition of Done insists on:
 *
 *   1. The seeded season renders and its summary matches the engine EXACTLY —
 *      12 played, 14 planned, $1,234.00 in fees (the skipped event excluded),
 *      a 126-day longest gap with the warning shown.
 *   2. Create / edit / delete work through Zod-validated Server Actions (RLS the
 *      backstop), and the fee round-trips as integer cents.
 *   3. Marking an event played OFFERS to log the linked round, and the round it
 *      creates carries the event's `event_id`.
 *
 * These sign in as the seeded reference athlete (Sam Rivera). The suite runs
 * serially against one shared auth backend (see playwright.config.ts).
 */

// A phone in a parking lot — the schedule is a 375px-first screen too.
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
 * never leave a stray event/round behind to skew the seeded-season summary the
 * other tests assert exactly. Names are the ones the create tests use.
 */
test.afterEach(async () => {
  const api = await apiClient();
  const { data: strays } = await api
    .from("events")
    .select("id")
    .or("name.ilike.Playoff Test%,name.ilike.Test Open%");
  for (const e of strays ?? []) {
    await api.from("rounds").delete().eq("event_id", e.id);
    await api.from("events").delete().eq("id", e.id);
  }
  await api.from("rounds").delete().eq("course", "Handoff GC");
});

test("renders the seeded season; summary matches the engine and the 126-day gap warns", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/schedule");

  await expect(
    page.getByRole("heading", { name: "Schedule", level: 1 }),
  ).toBeVisible();

  // The season summary, read from the engine — not recomputed in the page.
  const summary = page.getByRole("region", { name: "Season summary" });
  await expect(summary.getByText("14", { exact: true })).toBeVisible(); // planned
  await expect(summary.getByText("12", { exact: true })).toBeVisible(); // played
  await expect(summary.getByText("$1,234.00")).toBeVisible(); // fees, skipped excluded
  await expect(summary.getByText("126d")).toBeVisible(); // longest gap
  await expect(summary.getByText("of 14 planned")).toBeVisible();

  // The 60-day rule, crossed by the 126-day off-season, warns plainly.
  await expect(
    page.getByText(/longest gap between events is 126 days/i),
  ).toBeVisible();

  // Month grouping and the "Next up" marker on the soonest upcoming event.
  await expect(
    page.getByRole("heading", { name: "August 2025" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /NTPGA Medalist Fall #1/ }),
  ).toBeVisible();
  await expect(page.getByText("Next up").first()).toBeVisible();

  // A skipped event is present but marked skipped (it's off the plan, not gone).
  await expect(
    page.getByRole("link", { name: /HJGT Winter Series/ }),
  ).toBeVisible();
});

test("create, edit (fee round-trips as cents), and delete an event", async ({
  page,
}) => {
  const api = await apiClient();
  const name = `Test Open ${Date.now()}`;

  await signIn(page);

  // --- Create -------------------------------------------------------------
  await page.goto("/schedule/new");
  await page.getByLabel("Event name").fill(name);
  await page.getByLabel("Course").fill("Test Municipal");
  await page.getByLabel("City").fill("Denton");
  await page.getByLabel("Entry fee").fill("125.50");
  await page.getByLabel("Priority").selectOption("stretch");
  await page.getByRole("button", { name: /add event/i }).click();

  await expect(page).toHaveURL(/\/schedule$/);
  await expect(
    page.getByRole("link", { name: new RegExp(name) }),
  ).toBeVisible();

  // The fee is stored as integer cents, never a float.
  const { data: created } = await api
    .from("events")
    .select("*")
    .eq("name", name)
    .single();
  expect(created?.entry_fee_cents).toBe(12550);
  expect(created?.priority).toBe("stretch");
  expect(created?.status).toBe("not_registered");

  // --- Edit: mark it Free (a recorded 0, distinct from an unset fee) -------
  await page.getByRole("link", { name: new RegExp(name) }).click();
  await expect(page).toHaveURL(/\/schedule\/[0-9a-f-]+$/);
  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page).toHaveURL(/\/edit$/);
  await page.getByLabel("Entry fee").fill("0");
  await page.getByRole("button", { name: /save changes/i }).click();
  await expect(page).toHaveURL(/\/schedule\/[0-9a-f-]+$/);
  await expect(page.getByText("Free")).toBeVisible();

  const { data: edited } = await api
    .from("events")
    .select("entry_fee_cents")
    .eq("name", name)
    .single();
  expect(edited?.entry_fee_cents).toBe(0);

  // --- Delete with confirmation ------------------------------------------
  await page
    .getByRole("button", { name: new RegExp(`Delete event ${name}`) })
    .click();
  await page.getByRole("button", { name: "Delete event", exact: true }).click();
  await expect(page).toHaveURL(/\/schedule$/);
  await expect(page.getByRole("link", { name: new RegExp(name) })).toHaveCount(
    0,
  );

  const { data: afterDelete } = await api
    .from("events")
    .select("id")
    .eq("name", name);
  expect(afterDelete).toEqual([]);
});

test("marking an event played offers to log the linked round, which carries event_id", async ({
  page,
}) => {
  const api = await apiClient();
  const name = `Playoff Test ${Date.now()}`;

  await signIn(page);

  // A throwaway event, already registered, dated in the past so it can be played.
  await page.goto("/schedule/new");
  await page.getByLabel("Event name").fill(name);
  await page.getByLabel("Date").fill("2026-07-01");
  await page.getByLabel("Course").fill("Handoff GC");
  await page.getByLabel("Status").selectOption("registered");
  await page.getByRole("button", { name: /add event/i }).click();
  await expect(page).toHaveURL(/\/schedule$/);

  const { data: created } = await api
    .from("events")
    .select("id")
    .eq("name", name)
    .single();
  const eventId = created?.id as string;

  // Everything after creation runs in a try/finally so a mid-test assertion
  // failure can never leave this throwaway event (or its round) behind to
  // perturb the seeded-season summary asserted by the other tests.
  try {
    // Open the event and mark it played.
    await page.goto(`/schedule/${eventId}`);
    await page.getByRole("button", { name: /mark played/i }).click();

    // The OFFER appears once the status change redirects back and the server
    // component re-renders — played does not silently create a round.
    const logLink = page.getByRole("link", { name: /log this round/i });
    await expect(logLink).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/log your score/i)).toBeVisible();
    await expect(logLink).toHaveAttribute(
      "href",
      `/rounds/new?eventId=${eventId}`,
    );

    // Take the offer: the round form is pre-filled and names the event.
    await logLink.click();
    await expect(page).toHaveURL(
      new RegExp(`/rounds/new\\?eventId=${eventId}`),
    );
    await expect(
      page.getByText(new RegExp(`Logging your round for`)),
    ).toBeVisible();
    await expect(page.getByLabel("Course")).toHaveValue("Handoff GC");
    await expect(page.getByLabel("Date played")).toHaveValue("2026-07-01");

    await page.getByLabel("Score", { exact: true }).fill("79");
    await page.getByRole("button", { name: /log round/i }).click();
    await expect(page).toHaveURL(/\/rounds$/);

    // The round carries the event's id — the link is real, not cosmetic.
    const { data: round } = await api
      .from("rounds")
      .select("id, event_id, course")
      .eq("event_id", eventId)
      .single();
    expect(round?.event_id).toBe(eventId);
    expect(round?.course).toBe("Handoff GC");
  } finally {
    // Round first — it references the event.
    await api.from("rounds").delete().eq("event_id", eventId);
    await api.from("events").delete().eq("id", eventId);
  }
});
