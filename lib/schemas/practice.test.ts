import { describe, expect, it } from "vitest";

import { SESSION_TYPES } from "@/lib/stats";

import {
  SESSION_TYPE_HINTS,
  SESSION_TYPE_LABELS,
  practiceSchema,
} from "./practice";

/**
 * The practice schema's contract, pinned. What matters here: minutes is required
 * and positive (the rollup and the ratio check are only as honest as the minutes
 * feeding them), a blank optional field stores `null` rather than "", and a
 * future date is refused because practice is done, then logged.
 */

/** A complete, valid raw input — tests override just the field under test. */
function raw(partial: Record<string, unknown> = {}) {
  return {
    occurred_on: "2026-04-06",
    session_type: "putting",
    minutes: "45",
    focus: "Speed control",
    drill: "Lag ladder to 20/30/40 ft",
    result: "3 of 9 inside the leather",
    notes: null,
    ...partial,
  };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** `offset` days from today as a `YYYY-MM-DD` UTC calendar day. */
function dayFromToday(offset: number): string {
  const ms = Date.parse(`${todayIso()}T00:00:00Z`) + offset * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

describe("practiceSchema — minutes", () => {
  it("coerces the form's string to an integer", () => {
    expect(practiceSchema.parse(raw({ minutes: "45" })).minutes).toBe(45);
    expect(practiceSchema.parse(raw({ minutes: 90 })).minutes).toBe(90);
  });

  it("rejects a blank as required, never coercing it to 0", () => {
    for (const empty of ["", "   ", null, undefined]) {
      const parsed = practiceSchema.safeParse(raw({ minutes: empty }));
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.flatten().fieldErrors.minutes?.[0]).toBe(
          "Enter how long you practiced",
        );
      }
    }
  });

  it("rejects zero and negative minutes (the DB check agrees)", () => {
    expect(practiceSchema.safeParse(raw({ minutes: "0" })).success).toBe(false);
    expect(practiceSchema.safeParse(raw({ minutes: "-30" })).success).toBe(
      false,
    );
  });

  it("rejects a fractional minute", () => {
    expect(practiceSchema.safeParse(raw({ minutes: "45.5" })).success).toBe(
      false,
    );
  });

  it("caps a session at ten hours", () => {
    expect(practiceSchema.safeParse(raw({ minutes: "600" })).success).toBe(
      true,
    );
    expect(practiceSchema.safeParse(raw({ minutes: "601" })).success).toBe(
      false,
    );
  });
});

describe("practiceSchema — optional text", () => {
  it("stores a blank optional field as null, not an empty string", () => {
    const parsed = practiceSchema.parse(
      raw({ focus: "", drill: "   ", result: null, notes: undefined }),
    );
    expect(parsed.focus).toBeNull();
    expect(parsed.drill).toBeNull();
    expect(parsed.result).toBeNull();
    expect(parsed.notes).toBeNull();
  });

  it("trims what it keeps", () => {
    expect(practiceSchema.parse(raw({ focus: "  Speed  " })).focus).toBe(
      "Speed",
    );
  });

  it("rejects an over-long field rather than silently truncating", () => {
    expect(
      practiceSchema.safeParse(raw({ focus: "x".repeat(121) })).success,
    ).toBe(false);
    expect(
      practiceSchema.safeParse(raw({ notes: "x".repeat(2001) })).success,
    ).toBe(false);
  });
});

describe("practiceSchema — occurred_on", () => {
  it("accepts today and the past", () => {
    expect(
      practiceSchema.safeParse(raw({ occurred_on: todayIso() })).success,
    ).toBe(true);
    expect(
      practiceSchema.safeParse(raw({ occurred_on: dayFromToday(-400) }))
        .success,
    ).toBe(true);
  });

  it("refuses a future date — practice is done, then logged", () => {
    const parsed = practiceSchema.safeParse(
      raw({ occurred_on: dayFromToday(1) }),
    );
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors.occurred_on?.[0]).toBe(
        "That date is in the future",
      );
    }
  });

  it("refuses a malformed date", () => {
    expect(
      practiceSchema.safeParse(raw({ occurred_on: "04/06/2026" })).success,
    ).toBe(false);
    expect(
      practiceSchema.safeParse(raw({ occurred_on: "2026-13-01" })).success,
    ).toBe(false);
  });
});

describe("practiceSchema — session type", () => {
  it("accepts every enum member", () => {
    for (const type of SESSION_TYPES) {
      expect(
        practiceSchema.safeParse(raw({ session_type: type })).success,
      ).toBe(true);
    }
  });

  it("refuses a type outside the enum", () => {
    expect(
      practiceSchema.safeParse(raw({ session_type: "range" })).success,
    ).toBe(false);
  });

  it("labels and hints cover every type", () => {
    for (const type of SESSION_TYPES) {
      expect(SESSION_TYPE_LABELS[type]).toBeTruthy();
      expect(SESSION_TYPE_HINTS[type]).toBeTruthy();
    }
  });
});
