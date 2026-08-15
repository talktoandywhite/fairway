import { describe, expect, it } from "vitest";

import { makeEvent } from "@/lib/stats/__tests__/fixtures/factories";

import { buildScheduleList, statusCounts, type ScheduleItem } from "./present";

const kinds = <T>(items: ScheduleItem<T>[]) => items.map((i) => i.kind);

describe("buildScheduleList", () => {
  it("opens a month group when the month turns over", () => {
    const items = buildScheduleList(
      [
        makeEvent({ id: "a", plays_on: "2025-08-09" }),
        makeEvent({ id: "b", plays_on: "2025-08-23" }),
        makeEvent({ id: "c", plays_on: "2025-09-13" }),
      ],
      "2025-01-01",
    );
    const months = items.filter((i) => i.kind === "month");
    expect(months.map((m) => (m.kind === "month" ? m.label : ""))).toEqual([
      "August 2025",
      "September 2025",
    ]);
  });

  it("threads a gap marker between consecutive planned events, flagging > 60 days", () => {
    const items = buildScheduleList(
      [
        makeEvent({ id: "a", plays_on: "2026-05-02" }),
        makeEvent({ id: "b", plays_on: "2026-09-05" }), // 126 days later
      ],
      "2026-01-01",
    );
    const gap = items.find((i) => i.kind === "gap");
    expect(gap).toEqual({ kind: "gap", days: 126, exceedsLimit: true });
  });

  it("never shows a gap before the first planned event", () => {
    const items = buildScheduleList(
      [makeEvent({ id: "a", plays_on: "2025-08-09" })],
      "2025-01-01",
    );
    expect(items.some((i) => i.kind === "gap")).toBe(false);
  });

  it("renders a skipped event but gives it no gap and skips it in the span", () => {
    // Aug 9 (played) → [skipped Sep 6] → Nov 8 (played): the visible gap is the
    // planned-to-planned 91 days, matching the engine, not two smaller hops.
    const items = buildScheduleList(
      [
        makeEvent({ id: "a", plays_on: "2025-08-09", status: "played" }),
        makeEvent({ id: "x", plays_on: "2025-09-06", status: "skipped" }),
        makeEvent({ id: "b", plays_on: "2025-11-08", status: "played" }),
      ],
      "2025-01-01",
    );
    // One gap only, spanning Aug 9 → Nov 8.
    const gaps = items.filter((i) => i.kind === "gap");
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({ days: 91 });
    // The skipped event is still present as a row.
    const eventItems = items.filter((i) => i.kind === "event");
    expect(eventItems).toHaveLength(3);
  });

  it("flags the soonest upcoming planned event as next, and only that one", () => {
    const items = buildScheduleList(
      [
        makeEvent({ id: "past", plays_on: "2026-05-02", status: "played" }),
        makeEvent({ id: "soon", plays_on: "2026-09-05", status: "registered" }),
        makeEvent({
          id: "later",
          plays_on: "2026-10-03",
          status: "not_registered",
        }),
      ],
      "2026-08-12",
    );
    const nextIds = items
      .filter((i) => i.kind === "event" && i.isNext)
      .map((i) => (i.kind === "event" ? i.event.id : ""));
    expect(nextIds).toEqual(["soon"]);
  });

  it("sorts out-of-order input by date", () => {
    const items = buildScheduleList(
      [
        makeEvent({ id: "b", plays_on: "2025-09-13" }),
        makeEvent({ id: "a", plays_on: "2025-08-09" }),
      ],
      "2025-01-01",
    );
    expect(kinds(items)).toEqual(["month", "event", "month", "gap", "event"]);
    const first = items.find((i) => i.kind === "event");
    expect(first?.kind === "event" && first.event.id).toBe("a");
  });
});

describe("statusCounts", () => {
  it("counts planned (non-skipped), played, upcoming, and skipped", () => {
    const events = [
      makeEvent({ status: "played" }),
      makeEvent({ status: "played" }),
      makeEvent({ status: "registered" }),
      makeEvent({ status: "not_registered" }),
      makeEvent({ status: "skipped" }),
    ];
    expect(statusCounts(events)).toEqual({
      total: 5,
      planned: 4, // excludes the skipped one
      played: 2,
      upcoming: 2, // registered + not_registered
      skipped: 1,
    });
  });

  it("is all zeros for an empty schedule", () => {
    expect(statusCounts([])).toEqual({
      total: 0,
      planned: 0,
      played: 0,
      upcoming: 0,
      skipped: 0,
    });
  });
});
