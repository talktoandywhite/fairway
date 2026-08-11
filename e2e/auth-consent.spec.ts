import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import {
  APP_ORIGIN,
  LOCAL_SUPABASE_ANON_KEY,
  LOCAL_SUPABASE_URL,
} from "./local-supabase";

/**
 * The COPPA consent gate, proven end-to-end through the real app against the
 * local Supabase stack. This is the app-layer companion to the RLS-layer proof
 * in supabase/tests/rls_consent.sql: together they satisfy the Session 5
 * Definition of Done ("an under-13 signup cannot create a round until a guardian
 * consents, proven by a pgTAP test AND a Playwright e2e run").
 *
 * There is no rounds table yet (Session 6), so "cannot create a round" is
 * proven at the exact seam every future athlete-owned write goes through: a
 * write to the athlete's own row, attempted with the athlete's real session and
 * blocked by RLS while the account is pending — then succeeding once a guardian
 * has consented.
 */

/** A date-of-birth `yearsAgo` years before today, as `YYYY-MM-DD`. */
function yearsAgo(years: number): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString().slice(0, 10);
}

test("under-13 signup is frozen until a guardian consents", async ({
  page,
  browser,
}) => {
  const stamp = Date.now();
  const childEmail = `child.${stamp}@fairway.test`;
  const guardianEmail = `parent.${stamp}@fairway.test`;
  const password = "consent-gate-123";

  // A separate anon client, used to drive the athlete's real API session and to
  // read back the consent token exactly as the emailed link would carry it.
  const api = createClient(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_ANON_KEY);

  // --- Sign up as an under-13 athlete -------------------------------------
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Sky Junior");
  await page.getByLabel("Email").fill(childEmail);
  await page.getByLabel("Password").fill(password);
  await page.getByLabel("Date of birth").fill(yearsAgo(9));

  // The guardian field appears only once the birth date shows an under-13 age.
  const guardianField = page.getByLabel("Parent or guardian email");
  await expect(guardianField).toBeVisible();
  await guardianField.fill(guardianEmail);

  await page.getByRole("button", { name: /create account/i }).click();

  // --- Lands on the holding screen, not the app --------------------------
  await expect(page).toHaveURL(/\/pending-consent$/);
  await expect(
    page.getByRole("heading", { name: /your account is almost ready/i }),
  ).toBeVisible();
  await expect(page.getByText(guardianEmail)).toBeVisible();

  // --- Route protection: the app itself is out of reach ------------------
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/pending-consent$/);

  // --- The gate is real at the data layer, not just the router -----------
  const { data: signIn, error: signInError } =
    await api.auth.signInWithPassword({ email: childEmail, password });
  expect(signInError).toBeNull();
  const userId = signIn.user?.id;
  expect(userId).toBeTruthy();

  // A write to athlete data while pending is filtered out by RLS: no error, but
  // zero rows change. This is the stand-in for "cannot create a round".
  const blocked = await api
    .from("athletes")
    .update({ handicap_index: 11.1 })
    .eq("user_id", userId as string)
    .select();
  expect(blocked.error).toBeNull();
  expect(blocked.data).toEqual([]);

  // Read the consent token the way the guardian's email would deliver it. The
  // owner's RLS scopes this to their own athlete's request.
  const { data: requests } = await api
    .from("guardian_consent_requests")
    .select("token, guardian_email");
  expect(requests?.length).toBeGreaterThan(0);
  const token = requests?.[0]?.token as string;
  expect(token).toBeTruthy();

  // --- The guardian consents (a signed-out visitor with only the link) ----
  const guardianContext = await browser.newContext({ baseURL: APP_ORIGIN });
  const guardianPage = await guardianContext.newPage();
  await guardianPage.goto(`/consent?token=${token}`);
  await guardianPage.getByRole("button", { name: /i consent/i }).click();
  await expect(guardianPage.getByText(/account is now active/i)).toBeVisible();
  await guardianContext.close();

  // --- The same write that was blocked now succeeds ----------------------
  const allowed = await api
    .from("athletes")
    .update({ handicap_index: 12.2 })
    .eq("user_id", userId as string)
    .select();
  expect(allowed.error).toBeNull();
  expect(allowed.data?.length).toBe(1);

  // --- And the app opens up ----------------------------------------------
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("13-or-older signup goes straight into the app", async ({ page }) => {
  const stamp = Date.now();
  const email = `adult.${stamp}@fairway.test`;

  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Casey Senior");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("no-consent-needed-1");
  await page.getByLabel("Date of birth").fill(yearsAgo(20));

  // No guardian field for a 13+ account.
  await expect(page.getByLabel("Parent or guardian email")).toHaveCount(0);

  await page.getByRole("button", { name: /create account/i }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
