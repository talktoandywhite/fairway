import { describe, expect, it } from "vitest";

import { ageInYears, isUnderCoppaAge, signUpSchema } from "@/lib/schemas/auth";

/**
 * The age math is the UX/validation half of the COPPA gate (the RLS half is
 * proven in supabase/tests/rls_consent.sql). These cover the boundaries that
 * decide whether a child is asked for a guardian email: the day before, of, and
 * after a 13th birthday, and a leap-day birthday.
 */
describe("ageInYears", () => {
  it("counts whole years, birthday-aware", () => {
    expect(ageInYears("2000-06-15", new Date("2013-06-15T12:00:00Z"))).toBe(13);
    // Day before the 13th birthday is still 12.
    expect(ageInYears("2000-06-15", new Date("2013-06-14T12:00:00Z"))).toBe(12);
  });

  it("handles a leap-day birth date", () => {
    expect(ageInYears("2008-02-29", new Date("2021-02-28T12:00:00Z"))).toBe(12);
    expect(ageInYears("2008-02-29", new Date("2021-03-01T12:00:00Z"))).toBe(13);
  });

  it("returns null for an unparseable or impossible date", () => {
    expect(ageInYears("not-a-date")).toBeNull();
    expect(ageInYears("2011-02-30")).toBeNull();
  });
});

describe("isUnderCoppaAge", () => {
  const asOf = new Date("2026-08-10T12:00:00Z");

  it("is true strictly under 13, false at 13 and over", () => {
    expect(isUnderCoppaAge("2014-08-10", asOf)).toBe(true); // 12
    expect(isUnderCoppaAge("2013-08-10", asOf)).toBe(false); // exactly 13 today
    expect(isUnderCoppaAge("2013-08-11", asOf)).toBe(true); // 12 (birthday tomorrow)
    expect(isUnderCoppaAge("1998-08-10", asOf)).toBe(false);
  });
});

/**
 * Relative DOBs so the schema (which reads the real clock inside its refine)
 * stays deterministic regardless of when the test runs.
 */
function yearsAgo(years: number): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString().slice(0, 10);
}

describe("signUpSchema guardian requirement", () => {
  const base = {
    displayName: "Sky",
    email: "sky@example.com",
    password: "longenough",
  };

  it("requires a guardian email for an under-13 signup", () => {
    const result = signUpSchema.safeParse({
      ...base,
      dateOfBirth: yearsAgo(9),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.guardianEmail?.length).toBeGreaterThan(0);
    }
  });

  it("accepts an under-13 signup once a valid guardian email is given", () => {
    const result = signUpSchema.safeParse({
      ...base,
      dateOfBirth: yearsAgo(9),
      guardianEmail: "parent@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("does not require a guardian email for a 13+ signup", () => {
    const result = signUpSchema.safeParse({
      ...base,
      dateOfBirth: yearsAgo(16),
    });
    expect(result.success).toBe(true);
  });
});
