import { describe, expect, it } from "vitest";
import {
  averagePerRound,
  bestRound,
  lastNAverage,
  scoringAverage,
  strokesToGoal,
  trendline,
} from "@/lib/stats/rounds";
import { makeRound } from "./fixtures/factories";
import { present } from "./present";

describe("scoringAverage", () => {
  it("averages 18-hole tournament rounds", () => {
    const rounds = [
      makeRound({ score: 100 }),
      makeRound({ score: 104 }),
      makeRound({ score: 108 }),
    ];
    expect(scoringAverage(rounds)).toBe(104);
  });

  it("returns null for zero rounds (never 0)", () => {
    expect(scoringAverage([])).toBeNull();
  });

  it("returns null when only non-qualifying rounds exist", () => {
    const rounds = [
      makeRound({ score: 80, round_type: "practice_round" }),
      makeRound({ score: 45, holes: 9, round_type: "nine_hole" }),
      makeRound({ score: 95, round_type: "simulated_tournament" }),
    ];
    expect(scoringAverage(rounds)).toBeNull();
  });

  it("excludes non-tournament and non-18-hole rounds", () => {
    const rounds = [
      makeRound({ score: 100 }),
      makeRound({ score: 110 }),
      makeRound({ score: 50, round_type: "practice_round" }),
      makeRound({ score: 40, holes: 9, round_type: "tournament" }), // 9-hole tournament: excluded
    ];
    expect(scoringAverage(rounds)).toBe(105);
  });

  it("rounds to two decimals", () => {
    const rounds = [
      makeRound({ score: 100 }),
      makeRound({ score: 101 }),
      makeRound({ score: 101 }),
    ]; // 302 / 3 = 100.6667
    expect(scoringAverage(rounds)).toBe(100.67);
  });
});

describe("lastNAverage", () => {
  it("averages the n most recent qualifying rounds by date", () => {
    const rounds = [
      makeRound({ played_on: "2025-01-01", score: 120 }),
      makeRound({ played_on: "2025-02-01", score: 110 }),
      makeRound({ played_on: "2025-03-01", score: 100 }),
      makeRound({ played_on: "2025-04-01", score: 90 }),
    ];
    // Three most recent: 90, 100, 110 → 100.
    expect(lastNAverage(rounds, 3)).toBe(100);
  });

  it("is order-independent — sorts by date, not array position", () => {
    const rounds = [
      makeRound({ played_on: "2025-04-01", score: 90 }),
      makeRound({ played_on: "2025-01-01", score: 120 }),
      makeRound({ played_on: "2025-03-01", score: 100 }),
      makeRound({ played_on: "2025-02-01", score: 110 }),
    ];
    expect(lastNAverage(rounds, 3)).toBe(100);
  });

  it("returns null when fewer than n rounds qualify", () => {
    const rounds = [makeRound({ score: 100 }), makeRound({ score: 100 })];
    expect(lastNAverage(rounds, 3)).toBeNull();
  });

  it("returns a value at exactly n rounds (boundary)", () => {
    const rounds = [
      makeRound({ played_on: "2025-01-01", score: 100 }),
      makeRound({ played_on: "2025-02-01", score: 102 }),
      makeRound({ played_on: "2025-03-01", score: 104 }),
    ];
    expect(lastNAverage(rounds, 3)).toBe(102);
  });

  it("returns null for the empty case", () => {
    expect(lastNAverage([], 3)).toBeNull();
  });

  it("returns null for a non-positive n", () => {
    expect(lastNAverage([makeRound({ score: 100 })], 0)).toBeNull();
    expect(lastNAverage([makeRound({ score: 100 })], -2)).toBeNull();
  });
});

describe("bestRound", () => {
  it("returns the lowest qualifying score", () => {
    const rounds = [
      makeRound({ score: 105 }),
      makeRound({ score: 99 }),
      makeRound({ score: 112 }),
    ];
    expect(bestRound(rounds)).toBe(99);
  });

  it("ignores lower non-qualifying scores", () => {
    const rounds = [
      makeRound({ score: 100 }),
      makeRound({ score: 70, round_type: "practice_round" }),
      makeRound({ score: 40, holes: 9, round_type: "nine_hole" }),
    ];
    expect(bestRound(rounds)).toBe(100);
  });

  it("returns null for the empty case", () => {
    expect(bestRound([])).toBeNull();
  });

  it("returns the single value when exactly one round qualifies", () => {
    expect(bestRound([makeRound({ score: 103 })])).toBe(103);
  });
});

describe("strokesToGoal", () => {
  it("is positive when the average is above the target", () => {
    expect(strokesToGoal(107.25, 100)).toBe(7.25);
  });

  it("is negative when the goal is met", () => {
    expect(strokesToGoal(98, 100)).toBe(-2);
  });

  it("is zero exactly at the target", () => {
    expect(strokesToGoal(100, 100)).toBe(0);
  });

  it("returns null when the average is null", () => {
    expect(strokesToGoal(null, 100)).toBeNull();
  });
});

describe("averagePerRound", () => {
  it("averages a detail field over qualifying rounds", () => {
    const rounds = [
      makeRound({ penalty_strokes: 6 }),
      makeRound({ penalty_strokes: 4 }),
      makeRound({ penalty_strokes: 2 }),
    ];
    expect(averagePerRound(rounds, "penalty_strokes")).toBe(4);
  });

  it("skips nulls from BOTH numerator and denominator", () => {
    const rounds = [
      makeRound({ three_putts: 4 }),
      makeRound({ three_putts: null }), // not recorded — not a zero
      makeRound({ three_putts: 2 }),
    ];
    // (4 + 2) / 2 = 3, not (4 + 0 + 2) / 3 = 2.
    expect(averagePerRound(rounds, "three_putts")).toBe(3);
  });

  it("returns null when the field is recorded on no qualifying round", () => {
    const rounds = [
      makeRound({ total_putts: null }),
      makeRound({ total_putts: null }),
    ];
    expect(averagePerRound(rounds, "total_putts")).toBeNull();
  });

  it("ignores the field on non-qualifying rounds", () => {
    const rounds = [
      makeRound({ penalty_strokes: 2 }),
      makeRound({ penalty_strokes: 10, round_type: "practice_round" }),
    ];
    expect(averagePerRound(rounds, "penalty_strokes")).toBe(2);
  });

  it("returns null for the empty case", () => {
    expect(averagePerRound([], "penalty_strokes")).toBeNull();
  });

  it("rounds to two decimals", () => {
    const rounds = [
      makeRound({ penalty_strokes: 1 }),
      makeRound({ penalty_strokes: 2 }),
      makeRound({ penalty_strokes: 2 }),
    ]; // 5 / 3 = 1.6667
    expect(averagePerRound(rounds, "penalty_strokes")).toBe(1.67);
  });
});

describe("trendline", () => {
  it("fits an exactly linear series (slope in strokes/day)", () => {
    const rounds = [
      makeRound({ played_on: "2025-01-01", score: 100 }),
      makeRound({ played_on: "2025-01-11", score: 90 }),
    ];
    const fit = present(trendline(rounds));
    expect(fit.slope).toBeCloseTo(-1, 10); // -10 strokes over 10 days
    expect(fit.intercept).toBeCloseTo(100, 10);
  });

  it("fits a perfect line through three points", () => {
    const rounds = [
      makeRound({ played_on: "2025-01-01", score: 110 }),
      makeRound({ played_on: "2025-01-03", score: 106 }),
      makeRound({ played_on: "2025-01-05", score: 102 }),
    ];
    const fit = present(trendline(rounds));
    expect(fit.slope).toBeCloseTo(-2, 10); // -2 strokes/day
    expect(fit.intercept).toBeCloseTo(110, 10);
  });

  it("returns null for the empty case", () => {
    expect(trendline([])).toBeNull();
  });

  it("returns null with fewer than two qualifying rounds (boundary)", () => {
    expect(trendline([makeRound({ score: 100 })])).toBeNull();
  });

  it("returns null when every qualifying round is on the same day", () => {
    const rounds = [
      makeRound({ played_on: "2025-01-01", score: 100 }),
      makeRound({ played_on: "2025-01-01", score: 108 }),
    ];
    expect(trendline(rounds)).toBeNull();
  });

  it("only fits qualifying rounds", () => {
    const rounds = [
      makeRound({ played_on: "2025-01-01", score: 100 }),
      makeRound({ played_on: "2025-01-11", score: 90 }),
      makeRound({ played_on: "2025-01-06", score: 20, round_type: "nine_hole", holes: 9 }), // prettier-ignore
    ];
    const fit = present(trendline(rounds));
    expect(fit.slope).toBeCloseTo(-1, 10); // the nine-hole 20 does not bend it
  });
});
