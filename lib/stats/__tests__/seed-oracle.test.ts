import { describe, expect, it } from "vitest";
import {
  averagePerRound,
  bestRound,
  lastNAverage,
  longestGap,
  minutesByType,
  practiceRatio,
  scoringAverage,
  seasonFeeTotal,
  strokesToGoal,
  trendline,
} from "@/lib/stats";
import { seedEvents, seedPracticeSessions, seedRounds } from "./fixtures/seed";
import { present } from "./present";

/**
 * The oracle. These are the workbook's own numbers for the reference athlete,
 * locked in against `supabase/seed.sql`. If any of these drift, the engine no
 * longer reproduces the spreadsheet it replaces — which is the entire promise of
 * the MVP. The headline assertion is the exclusion of non-tournament rounds.
 */
describe("stats engine vs. the reference workbook", () => {
  it("scoring average is 107.25 over the twelve tournament rounds", () => {
    expect(scoringAverage(seedRounds)).toBe(107.25);
  });

  it("excludes non-tournament rounds from the scoring average", () => {
    // The seed includes a practice round of 98 and a nine-hole 46 — lower raw
    // scores than any tournament round. If either leaked in, the average would
    // drop below 107.25. This is the exclusion, proven directly.
    const tournamentOnly = seedRounds.filter(
      (r) => r.round_type === "tournament",
    );
    expect(scoringAverage(seedRounds)).toBe(scoringAverage(tournamentOnly));
  });

  it("last-3 average is 101.67 (104, 101, 100 — the three most recent)", () => {
    expect(lastNAverage(seedRounds, 3)).toBe(101.67);
  });

  it("best round is 100, not the practice-round 98 or nine-hole 46", () => {
    expect(bestRound(seedRounds)).toBe(100);
  });

  it("strokes to goal is 7.25 against the 100 target", () => {
    expect(strokesToGoal(scoringAverage(seedRounds), 100)).toBe(7.25);
  });

  it("per-round leak averages match the tournament detail block", () => {
    expect(averagePerRound(seedRounds, "penalty_strokes")).toBe(4.83);
    expect(averagePerRound(seedRounds, "three_putts")).toBe(3.5);
    expect(averagePerRound(seedRounds, "total_putts")).toBe(33.75);
  });

  it("the scoring trend points down (improving) over the season", () => {
    const fit = present(trendline(seedRounds));
    // slope is strokes/day; negative = getting better.
    expect(fit.slope).toBeLessThan(0);
    // The fit starts near the opening 116 and, projected to the final round
    // (2026-05-02, 266 days on), lands near the closing 100.
    expect(fit.intercept).toBeGreaterThan(112);
    expect(fit.intercept).toBeLessThan(118);
    const finalX = 266;
    const projected = fit.intercept + fit.slope * finalX;
    expect(projected).toBeGreaterThan(98);
    expect(projected).toBeLessThan(104);
  });

  it("longest gap is 126 days (the off-season, 2026-05-02 → 2026-09-05)", () => {
    expect(longestGap(seedEvents)).toBe(126);
  });

  it("season fee total is $1,234.00, excluding the skipped event", () => {
    expect(seasonFeeTotal(seedEvents)).toBe(123400);
  });

  it("practice minutes total 985, weighted to short game and putting", () => {
    const minutes = minutesByType(seedPracticeSessions);
    const total = Object.values(minutes).reduce((a, b) => a + b, 0);
    expect(total).toBe(985);
    expect(minutes.short_game).toBe(300);
    expect(minutes.putting).toBe(150);
    expect(minutes.on_course).toBe(240);
    expect(minutes.gym).toBe(100);
    expect(minutes.range_full_swing).toBe(105);
    expect(minutes.range_wedges).toBe(90);
    expect(minutes.lesson).toBe(0);
  });

  it("practice ratio is short-game-heavy and sums to 1", () => {
    const ratio = present(practiceRatio(seedPracticeSessions));
    const sum = Object.values(ratio).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
    expect(ratio.short_game).toBeCloseTo(300 / 985, 10);
    // Short game plus putting is the majority of the athlete's time — the
    // "right way round" mix the workbook wants to see.
    expect(ratio.short_game + ratio.putting).toBeGreaterThan(0.4);
  });
});
