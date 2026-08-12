import { describe, expect, it } from "vitest";

import {
  DETAIL_COUNT_FIELDS,
  defaultsForType,
  roundSchema,
  type RoundInput,
} from "./round";

/**
 * The one test that matters most in Session 8: an un-entered detail field parses
 * to `null`, never `0`. Everything else here guards the edges around that.
 */

/** A minimal, valid required-only round (no detail fields supplied). */
function coreOnly(overrides: Record<string, unknown> = {}) {
  return {
    played_on: "2026-05-01",
    course: "Tenison Highlands",
    round_type: "tournament",
    holes: 18,
    par: 72,
    score: 100,
    ...overrides,
  };
}

describe("roundSchema — null-not-zero contract", () => {
  it("parses every un-entered detail field to null, not 0", () => {
    const parsed = roundSchema.parse(coreOnly());
    for (const field of DETAIL_COUNT_FIELDS) {
      expect(parsed[field], `${field} should be null when unset`).toBeNull();
    }
    expect(parsed.notes).toBeNull();
  });

  it("treats an empty string the same as unset (null)", () => {
    const parsed = roundSchema.parse(
      coreOnly({ three_putts: "", penalty_strokes: "   ", notes: "  " }),
    );
    expect(parsed.three_putts).toBeNull();
    expect(parsed.penalty_strokes).toBeNull();
    expect(parsed.notes).toBeNull();
  });

  it("preserves a genuine recorded zero (not the same as null)", () => {
    // A clean round: zero penalties is a real, meaningful measurement.
    const parsed = roundSchema.parse(
      coreOnly({ penalty_strokes: 0, three_putts: "0" }),
    );
    expect(parsed.penalty_strokes).toBe(0);
    expect(parsed.three_putts).toBe(0);
  });

  it("accepts numeric strings from FormData and coerces them", () => {
    const parsed = roundSchema.parse(
      coreOnly({ score: "88", par: "72", holes: "18", total_putts: "31" }),
    );
    expect(parsed.score).toBe(88);
    expect(parsed.par).toBe(72);
    expect(parsed.holes).toBe(18);
    expect(parsed.total_putts).toBe(31);
  });
});

describe("roundSchema — required fields", () => {
  it("rejects a missing score rather than defaulting it to 0", () => {
    const result = roundSchema.safeParse(coreOnly({ score: "" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("score"))).toBe(
        true,
      );
    }
  });

  it("rejects an empty course", () => {
    expect(roundSchema.safeParse(coreOnly({ course: "   " })).success).toBe(
      false,
    );
  });

  it("rejects a future played_on date", () => {
    const nextYear = new Date();
    nextYear.setUTCFullYear(nextYear.getUTCFullYear() + 1);
    const future = nextYear.toISOString().slice(0, 10);
    expect(roundSchema.safeParse(coreOnly({ played_on: future })).success).toBe(
      false,
    );
  });

  it("rejects holes other than 9 or 18", () => {
    expect(roundSchema.safeParse(coreOnly({ holes: 12 })).success).toBe(false);
  });
});

describe("roundSchema — detail validation", () => {
  it("rejects negative counts", () => {
    expect(
      roundSchema.safeParse(coreOnly({ penalty_strokes: -1 })).success,
    ).toBe(false);
  });

  it("rejects fairways hit exceeding fairways possible", () => {
    const result = roundSchema.safeParse(
      coreOnly({ fairways_hit: 15, fairways_possible: 14 }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes("fairways_hit")),
      ).toBe(true);
    }
  });

  it("allows fairways hit and possible when hit <= possible", () => {
    const parsed: RoundInput = roundSchema.parse(
      coreOnly({ fairways_hit: 8, fairways_possible: 14 }),
    );
    expect(parsed.fairways_hit).toBe(8);
    expect(parsed.fairways_possible).toBe(14);
  });
});

describe("defaultsForType", () => {
  it("defaults nine-hole rounds to 9 holes / par 36", () => {
    expect(defaultsForType("nine_hole")).toEqual({ holes: 9, par: 36 });
  });

  it("defaults every other type to 18 holes / par 72", () => {
    expect(defaultsForType("tournament")).toEqual({ holes: 18, par: 72 });
    expect(defaultsForType("practice_round")).toEqual({ holes: 18, par: 72 });
    expect(defaultsForType("simulated_tournament")).toEqual({
      holes: 18,
      par: 72,
    });
  });
});
