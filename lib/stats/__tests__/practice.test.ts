import { describe, expect, it } from "vitest";
import { minutesByType, practiceRatio } from "@/lib/stats/practice";
import { SESSION_TYPES } from "@/lib/stats/types";
import { makeSegment } from "./fixtures/factories";
import { present } from "./present";

describe("minutesByType", () => {
  it("sums minutes grouped by session type", () => {
    const sessions = [
      makeSegment({ session_type: "putting", minutes: 30 }),
      makeSegment({ session_type: "putting", minutes: 15 }),
      makeSegment({ session_type: "short_game", minutes: 60 }),
    ];
    const totals = minutesByType(sessions);
    expect(totals.putting).toBe(45);
    expect(totals.short_game).toBe(60);
  });

  it("returns every session type as a key, defaulting to 0", () => {
    const totals = minutesByType([
      makeSegment({ session_type: "exercise", minutes: 50 }),
    ]);
    for (const type of SESSION_TYPES) {
      expect(totals[type]).toBe(type === "exercise" ? 50 : 0);
    }
  });

  it("returns all-zero totals for the empty case", () => {
    const totals = minutesByType([]);
    for (const type of SESSION_TYPES) {
      expect(totals[type]).toBe(0);
    }
  });

  it("handles a single session (boundary)", () => {
    const totals = minutesByType([
      makeSegment({ session_type: "on_course", minutes: 120 }),
    ]);
    expect(totals.on_course).toBe(120);
  });
});

describe("practiceRatio", () => {
  it("returns each type's fraction of total minutes", () => {
    const sessions = [
      makeSegment({ session_type: "putting", minutes: 30 }),
      makeSegment({ session_type: "short_game", minutes: 60 }),
      makeSegment({ session_type: "exercise", minutes: 10 }),
    ];
    const ratio = present(practiceRatio(sessions));
    expect(ratio.putting).toBeCloseTo(0.3, 10);
    expect(ratio.short_game).toBeCloseTo(0.6, 10);
    expect(ratio.exercise).toBeCloseTo(0.1, 10);
  });

  it("produces fractions that sum to 1", () => {
    const sessions = [
      makeSegment({ session_type: "putting", minutes: 45 }),
      makeSegment({ session_type: "range_wedges", minutes: 35 }),
      makeSegment({ session_type: "on_course", minutes: 90 }),
    ];
    const ratio = present(practiceRatio(sessions));
    const sum = SESSION_TYPES.reduce((acc, t) => acc + ratio[t], 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it("returns null when no minutes are logged (empty case)", () => {
    expect(practiceRatio([])).toBeNull();
  });

  it("returns null when every session logged zero minutes", () => {
    const sessions = [
      makeSegment({ session_type: "putting", minutes: 0 }),
      makeSegment({ session_type: "exercise", minutes: 0 }),
    ];
    expect(practiceRatio(sessions)).toBeNull();
  });

  it("assigns 1.0 to a single type when it is the only one (boundary)", () => {
    const ratio = present(
      practiceRatio([makeSegment({ session_type: "short_game", minutes: 75 })]),
    );
    expect(ratio.short_game).toBe(1);
    expect(ratio.putting).toBe(0);
  });
});
