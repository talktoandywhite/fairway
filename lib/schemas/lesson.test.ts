import { describe, expect, it } from "vitest";

import {
  HOMEWORK_STATUSES,
  HOMEWORK_STATUS_LABELS,
  lessonSchema,
} from "./lesson";

/**
 * The lesson schema's contract, pinned.
 *
 * What matters here: the cost is entered in dollars and stored as integer cents
 * (never a float), a blank cost is `null` while a typed 0 is a recorded zero,
 * `homework_done` keeps "not answered" distinct from "not done", blank optional
 * fields store `null` rather than "", and a future date is refused because a
 * lesson is taken and then logged.
 */

/** A complete, valid raw input — tests override just the field under test. */
function raw(partial: Record<string, unknown> = {}) {
  return {
    occurred_on: "2026-03-12",
    coach_name: "Coach Diaz",
    swing_key: "Putter face square at impact",
    drill_assigned: "Gate drill from 4 ft, 20 makes",
    homework_target: "Every practice for 3 weeks",
    homework_done: "yes",
    cost: "90",
    what_changed: "Three-putts down to two a round.",
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

/** The first field error at a Zod path. */
function errorAt(
  result: ReturnType<typeof lessonSchema.safeParse>,
  path: string,
): string | undefined {
  if (result.success) return undefined;
  return result.error.issues.find((i) => i.path.join(".") === path)?.message;
}

describe("lessonSchema — the whole lesson", () => {
  it("parses a complete lesson into the shape the table stores", () => {
    expect(lessonSchema.parse(raw())).toEqual({
      occurred_on: "2026-03-12",
      coach_name: "Coach Diaz",
      swing_key: "Putter face square at impact",
      drill_assigned: "Gate drill from 4 ft, 20 makes",
      homework_target: "Every practice for 3 weeks",
      homework_done: "yes",
      cost_cents: 9000,
      what_changed: "Three-putts down to two a round.",
    });
  });

  it("accepts a lesson that is only a date — the rest can be filled in later", () => {
    const parsed = lessonSchema.parse({
      occurred_on: "2026-03-12",
      coach_name: "",
      swing_key: "",
      drill_assigned: "",
      homework_target: "",
      homework_done: "",
      cost: "",
      what_changed: "",
    });
    expect(parsed).toEqual({
      occurred_on: "2026-03-12",
      coach_name: null,
      swing_key: null,
      drill_assigned: null,
      homework_target: null,
      homework_done: null,
      cost_cents: null,
      what_changed: null,
    });
  });

  it("trims text and stores a blank field as null, never as an empty string", () => {
    const parsed = lessonSchema.parse(
      raw({ coach_name: "  Coach Diaz  ", swing_key: "   " }),
    );
    expect(parsed.coach_name).toBe("Coach Diaz");
    expect(parsed.swing_key).toBeNull();
  });

  it("caps the long fields", () => {
    expect(
      lessonSchema.safeParse(raw({ coach_name: "x".repeat(121) })).success,
    ).toBe(false);
    expect(
      lessonSchema.safeParse(raw({ what_changed: "x".repeat(2001) })).success,
    ).toBe(false);
    expect(
      lessonSchema.safeParse(raw({ what_changed: "x".repeat(2000) })).success,
    ).toBe(true);
  });
});

describe("lessonSchema — the date", () => {
  it("accepts today and the past", () => {
    expect(
      lessonSchema.safeParse(raw({ occurred_on: todayIso() })).success,
    ).toBe(true);
    expect(
      lessonSchema.safeParse(raw({ occurred_on: dayFromToday(-400) })).success,
    ).toBe(true);
  });

  it("refuses a future date — a lesson is taken, then logged", () => {
    const parsed = lessonSchema.safeParse(
      raw({ occurred_on: dayFromToday(1) }),
    );
    expect(parsed.success).toBe(false);
    expect(errorAt(parsed, "occurred_on")).toBe("That date is in the future");
  });

  it("refuses a malformed date", () => {
    expect(
      lessonSchema.safeParse(raw({ occurred_on: "03/12/2026" })).success,
    ).toBe(false);
    expect(
      lessonSchema.safeParse(raw({ occurred_on: "2026-13-01" })).success,
    ).toBe(false);
    expect(lessonSchema.safeParse(raw({ occurred_on: "" })).success).toBe(
      false,
    );
  });
});

describe("lessonSchema — homework_done", () => {
  it("accepts every stored status", () => {
    for (const status of HOMEWORK_STATUSES) {
      expect(
        lessonSchema.parse(raw({ homework_done: status })).homework_done,
      ).toBe(status);
    }
  });

  it("keeps 'not answered' distinct from 'not done'", () => {
    // Blank is null: the athlete hasn't said, which is not the same as saying no.
    expect(
      lessonSchema.parse(raw({ homework_done: "" })).homework_done,
    ).toBeNull();
    expect(
      lessonSchema.parse(raw({ homework_done: null })).homework_done,
    ).toBeNull();
    expect(lessonSchema.parse(raw({ homework_done: "no" })).homework_done).toBe(
      "no",
    );
  });

  it("refuses a value that isn't in the enum", () => {
    expect(
      lessonSchema.safeParse(raw({ homework_done: "maybe" })).success,
    ).toBe(false);
  });

  it("labels 'no' as 'Not yet' — the record is honest, the word is kind", () => {
    expect(HOMEWORK_STATUS_LABELS.no).toBe("Not yet");
  });
});

describe("lessonSchema — the cost", () => {
  it("converts dollars to integer cents", () => {
    expect(lessonSchema.parse(raw({ cost: "90" })).cost_cents).toBe(9000);
    expect(lessonSchema.parse(raw({ cost: "90.00" })).cost_cents).toBe(9000);
    expect(lessonSchema.parse(raw({ cost: "125.50" })).cost_cents).toBe(12550);
  });

  it("accepts a typed dollar sign and thousands separators", () => {
    expect(lessonSchema.parse(raw({ cost: "$90" })).cost_cents).toBe(9000);
    expect(lessonSchema.parse(raw({ cost: "$1,234.50" })).cost_cents).toBe(
      123450,
    );
  });

  it("never emits a float", () => {
    const cents = lessonSchema.parse(raw({ cost: "19.99" })).cost_cents;
    expect(cents).toBe(1999);
    expect(Number.isInteger(cents)).toBe(true);
  });

  it("rounds a stray third decimal to the nearest cent", () => {
    expect(lessonSchema.parse(raw({ cost: "90.005" })).cost_cents).toBe(9001);
    expect(lessonSchema.parse(raw({ cost: "90.004" })).cost_cents).toBe(9000);
  });

  it("keeps 'not recorded' distinct from 'no charge'", () => {
    expect(lessonSchema.parse(raw({ cost: "" })).cost_cents).toBeNull();
    expect(lessonSchema.parse(raw({ cost: "0" })).cost_cents).toBe(0);
  });

  it("refuses a negative cost and a non-number", () => {
    expect(lessonSchema.safeParse(raw({ cost: "-10" })).success).toBe(false);
    const parsed = lessonSchema.safeParse(raw({ cost: "ninety" }));
    expect(parsed.success).toBe(false);
    expect(errorAt(parsed, "cost")).toBe("Enter the cost as a number, e.g. 90");
  });
});
