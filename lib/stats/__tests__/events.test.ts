import { describe, expect, it } from "vitest";
import { gapDays, longestGap, seasonFeeTotal } from "@/lib/stats/events";
import { makeEvent } from "./fixtures/factories";

describe("gapDays", () => {
  it("returns days between consecutive planned events, chronologically", () => {
    const events = [
      makeEvent({ plays_on: "2025-01-01" }),
      makeEvent({ plays_on: "2025-01-15" }),
      makeEvent({ plays_on: "2025-02-15" }),
    ];
    expect(gapDays(events)).toEqual([14, 31]);
  });

  it("sorts by date regardless of array order", () => {
    const events = [
      makeEvent({ plays_on: "2025-02-15" }),
      makeEvent({ plays_on: "2025-01-01" }),
      makeEvent({ plays_on: "2025-01-15" }),
    ];
    expect(gapDays(events)).toEqual([14, 31]);
  });

  it("excludes skipped events from the gap calculation", () => {
    const events = [
      makeEvent({ plays_on: "2025-01-01", status: "played" }),
      makeEvent({ plays_on: "2025-01-15", status: "skipped" }),
      makeEvent({ plays_on: "2025-02-01", status: "registered" }),
    ];
    // The skipped middle event is not a real gap-filler: 31 days, not 14 + 17.
    expect(gapDays(events)).toEqual([31]);
  });

  it("counts not_registered and registered events as planned", () => {
    const events = [
      makeEvent({ plays_on: "2025-01-01", status: "not_registered" }),
      makeEvent({ plays_on: "2025-01-08", status: "registered" }),
    ];
    expect(gapDays(events)).toEqual([7]);
  });

  it("returns [] for the empty case", () => {
    expect(gapDays([])).toEqual([]);
  });

  it("returns [] with a single planned event (boundary — no gap)", () => {
    expect(gapDays([makeEvent({ plays_on: "2025-01-01" })])).toEqual([]);
  });
});

describe("longestGap", () => {
  it("returns the maximum consecutive gap", () => {
    const events = [
      makeEvent({ plays_on: "2025-01-01" }),
      makeEvent({ plays_on: "2025-01-15" }), // 14
      makeEvent({ plays_on: "2025-04-15" }), // 90
      makeEvent({ plays_on: "2025-05-01" }), // 16
    ];
    expect(longestGap(events)).toBe(90);
  });

  it("returns null with fewer than two planned events (boundary)", () => {
    expect(longestGap([makeEvent({ plays_on: "2025-01-01" })])).toBeNull();
  });

  it("returns null for the empty case", () => {
    expect(longestGap([])).toBeNull();
  });

  it("returns null when only one non-skipped event remains", () => {
    const events = [
      makeEvent({ plays_on: "2025-01-01", status: "played" }),
      makeEvent({ plays_on: "2025-03-01", status: "skipped" }),
    ];
    expect(longestGap(events)).toBeNull();
  });
});

describe("seasonFeeTotal", () => {
  it("sums entry fees over planned events, in cents", () => {
    const events = [
      makeEvent({ entry_fee_cents: 8500 }),
      makeEvent({ entry_fee_cents: 6000 }),
    ];
    expect(seasonFeeTotal(events)).toBe(14500);
  });

  it("excludes skipped events", () => {
    const events = [
      makeEvent({ entry_fee_cents: 8500, status: "played" }),
      makeEvent({ entry_fee_cents: 21900, status: "skipped" }),
    ];
    expect(seasonFeeTotal(events)).toBe(8500);
  });

  it("treats a null fee as zero", () => {
    const events = [
      makeEvent({ entry_fee_cents: 6000 }),
      makeEvent({ entry_fee_cents: null }),
    ];
    expect(seasonFeeTotal(events)).toBe(6000);
  });

  it("returns 0 for the empty case (a sum, not an average)", () => {
    expect(seasonFeeTotal([])).toBe(0);
  });

  it("returns 0 when every event is skipped", () => {
    const events = [
      makeEvent({ entry_fee_cents: 8500, status: "skipped" }),
      makeEvent({ entry_fee_cents: 6000, status: "skipped" }),
    ];
    expect(seasonFeeTotal(events)).toBe(0);
  });
});
