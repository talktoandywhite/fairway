import { describe, expect, it } from "vitest";
import {
  daysBetween,
  isQualifyingRound,
  mean,
  qualifyingRounds,
  round2,
} from "@/lib/stats/helpers";
import { makeRound } from "./fixtures/factories";

describe("round2", () => {
  it("rounds to two decimal places", () => {
    expect(round2(101.666666)).toBe(101.67);
    expect(round2(107.25)).toBe(107.25);
  });

  it("rounds half up, dodging the float artifact", () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(0.005)).toBe(0.01);
  });

  it("handles negatives", () => {
    expect(round2(-2.345)).toBe(-2.34);
  });
});

describe("mean", () => {
  it("averages a list", () => {
    expect(mean([2, 4, 6])).toBe(4);
  });

  it("returns the single value for a one-element list", () => {
    expect(mean([9])).toBe(9);
  });
});

describe("daysBetween", () => {
  it("counts whole calendar days", () => {
    expect(daysBetween("2025-01-01", "2025-01-15")).toBe(14);
  });

  it("spans month and year boundaries without drift", () => {
    // 2025-11-08 → 2026-02-14, the seed's off-season gap.
    expect(daysBetween("2025-11-08", "2026-02-14")).toBe(98);
  });

  it("is zero for the same day", () => {
    expect(daysBetween("2025-05-02", "2025-05-02")).toBe(0);
  });

  it("is not thrown off by DST transitions (UTC parsing)", () => {
    // US spring-forward is 2025-03-09; a naive local Date would return 30.
    expect(daysBetween("2025-03-01", "2025-03-31")).toBe(30);
  });
});

describe("isQualifyingRound / qualifyingRounds", () => {
  it("accepts an 18-hole tournament round", () => {
    expect(isQualifyingRound(makeRound({ round_type: "tournament" }))).toBe(
      true,
    );
  });

  it("rejects non-tournament and non-18-hole rounds", () => {
    expect(isQualifyingRound(makeRound({ round_type: "practice_round" }))).toBe(
      false,
    );
    expect(
      isQualifyingRound(makeRound({ holes: 9, round_type: "nine_hole" })),
    ).toBe(false);
    expect(
      isQualifyingRound(makeRound({ holes: 9, round_type: "tournament" })),
    ).toBe(false);
  });

  it("filters a mixed list to the qualifying rounds only", () => {
    const rounds = [
      makeRound({ round_type: "tournament" }),
      makeRound({ round_type: "simulated_tournament" }),
      makeRound({ holes: 9, round_type: "nine_hole" }),
    ];
    expect(qualifyingRounds(rounds)).toHaveLength(1);
  });
});
