import { describe, expect, it } from "vitest";

import type { EventRow } from "@/lib/stats";
import type { Database } from "@/types/database";
import {
  currentPhase,
  daysUntil,
  describeTrend,
  leakProgress,
  nextEvent,
  resolveLeakField,
  upcomingPhase,
} from "./present";

type PhaseRow = Database["public"]["Tables"]["phases"]["Row"];

function makePhase(
  over: Partial<PhaseRow> & { starts_on: string; ends_on: string },
): PhaseRow {
  return {
    id: `phase-${over.starts_on}`,
    athlete_id: "a1",
    seq: 1,
    name: "Phase",
    main_job: null,
    score_target: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: null,
    ...over,
  };
}

function makeEvent(over: Partial<EventRow> & { plays_on: string }): EventRow {
  return {
    id: `event-${over.plays_on}`,
    athlete_id: "a1",
    tour_id: null,
    name: "Event",
    course: null,
    city: null,
    holes: 18,
    entry_fee_cents: null,
    priority: "optional",
    status: "registered",
    notes: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: null,
    ...over,
  };
}

describe("daysUntil", () => {
  it("counts whole calendar days forward and back", () => {
    expect(daysUntil("2026-08-12", "2026-09-05")).toBe(24);
    expect(daysUntil("2026-08-12", "2026-08-12")).toBe(0);
    expect(daysUntil("2026-09-05", "2026-08-12")).toBe(-24);
  });

  it("is exact across a month and DST boundaries (UTC midnight basis)", () => {
    expect(daysUntil("2026-03-01", "2026-04-01")).toBe(31);
    expect(daysUntil("2026-05-02", "2026-09-05")).toBe(126); // the seed off-season gap
  });
});

describe("resolveLeakField", () => {
  it("maps the two measured leaks by keyword", () => {
    expect(resolveLeakField("Penalty strokes (OB, lost ball, water)")).toBe(
      "penalty_strokes",
    );
    expect(resolveLeakField("Three-putts")).toBe("three_putts");
    expect(resolveLeakField("3 putts")).toBe("three_putts");
  });

  it("returns null for leaks with no honest per-round column", () => {
    expect(resolveLeakField("Chunked / bladed chips")).toBeNull();
    expect(resolveLeakField("Hero shots from trouble")).toBeNull();
  });
});

describe("describeTrend", () => {
  it("returns null when there is no fit", () => {
    expect(describeTrend(null)).toBeNull();
  });

  it("reads a downward slope as improving, in strokes/month", () => {
    // -0.06 strokes/day * 30 = -1.8/month.
    const d = describeTrend({ slope: -0.06, intercept: 116 });
    expect(d).toEqual({ direction: "improving", strokesPerMonth: -1.8 });
  });

  it("reads an upward slope as regressing", () => {
    const d = describeTrend({ slope: 0.05, intercept: 90 });
    expect(d?.direction).toBe("regressing");
    expect(d?.strokesPerMonth).toBe(1.5);
  });

  it("calls a near-flat slope steady, not a false trend", () => {
    const d = describeTrend({ slope: -0.01, intercept: 100 }); // -0.3/month
    expect(d?.direction).toBe("steady");
  });
});

describe("currentPhase / upcomingPhase", () => {
  const phases = [
    makePhase({ seq: 1, starts_on: "2025-08-01", ends_on: "2025-09-15" }),
    makePhase({ seq: 2, starts_on: "2025-09-16", ends_on: "2025-11-15" }),
    makePhase({ seq: 3, starts_on: "2025-11-16", ends_on: "2026-01-31" }),
  ];

  it("finds the phase containing today, inclusive of both ends", () => {
    expect(currentPhase(phases, "2025-09-16")?.seq).toBe(2);
    expect(currentPhase(phases, "2025-09-15")?.seq).toBe(1); // end is inclusive
  });

  it("returns null when today is outside every phase", () => {
    expect(currentPhase(phases, "2026-08-12")).toBeNull();
    expect(upcomingPhase(phases, "2026-08-12")).toBeNull(); // all in the past
  });

  it("points at the next phase when today is between blocks", () => {
    expect(upcomingPhase(phases, "2025-07-01")?.seq).toBe(1);
  });
});

describe("nextEvent", () => {
  const events = [
    makeEvent({ plays_on: "2026-05-02", status: "played" }),
    makeEvent({ plays_on: "2026-09-05", status: "registered" }),
    makeEvent({ plays_on: "2026-10-03", status: "not_registered" }),
    makeEvent({ plays_on: "2026-08-20", status: "skipped" }),
  ];

  it("returns the soonest non-skipped event on or after today", () => {
    // 2026-08-20 is sooner but skipped; the next real event is 2026-09-05.
    expect(nextEvent(events, "2026-08-12")?.plays_on).toBe("2026-09-05");
  });

  it("includes an event happening today", () => {
    expect(nextEvent(events, "2026-09-05")?.plays_on).toBe("2026-09-05");
  });

  it("returns null when nothing is scheduled ahead", () => {
    expect(nextEvent(events, "2026-11-01")).toBeNull();
    expect(nextEvent([], "2026-08-12")).toBeNull();
  });
});

describe("leakProgress", () => {
  it("measures how far a leak has closed from high toward target", () => {
    // penalties: high 10, target 2, live 4.83 -> (10-4.83)/(10-2) ≈ 0.646
    expect(leakProgress(10, 2, 4.83)).toBeCloseTo(0.646, 3);
    // three-putts: high 7, target 2, live 3.5 -> 0.7
    expect(leakProgress(7, 2, 3.5)).toBeCloseTo(0.7, 5);
  });

  it("clamps to [0,1] for met and regressed leaks", () => {
    expect(leakProgress(10, 2, 2)).toBe(1); // at target
    expect(leakProgress(10, 2, 1)).toBe(1); // past target
    expect(leakProgress(10, 2, 12)).toBe(0); // worse than the start
  });

  it("never divides by zero when high already equals target", () => {
    expect(leakProgress(2, 2, 2)).toBe(1);
    expect(leakProgress(2, 2, 3)).toBe(0);
  });
});
