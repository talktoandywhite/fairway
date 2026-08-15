import { describe, expect, it } from "vitest";

import { lessonSpendCents, outstandingHomework } from "@/lib/stats/lessons";
import { makeLesson } from "./fixtures/factories";

describe("lessonSpendCents", () => {
  it("sums recorded costs in integer cents", () => {
    const lessons = [
      makeLesson({ cost_cents: 9000 }),
      makeLesson({ cost_cents: 9000 }),
      makeLesson({ cost_cents: 12500 }),
    ];
    expect(lessonSpendCents(lessons)).toBe(30500);
  });

  it("treats an unrecorded cost as 0, not as a reason to drop the lesson", () => {
    const lessons = [
      makeLesson({ cost_cents: 9000 }),
      makeLesson({ cost_cents: null }),
    ];
    expect(lessonSpendCents(lessons)).toBe(9000);
  });

  it("counts a recorded zero (a lesson that wasn't charged for)", () => {
    expect(lessonSpendCents([makeLesson({ cost_cents: 0 })])).toBe(0);
  });

  it("returns 0 for no lessons — a sum over nothing is genuinely zero", () => {
    expect(lessonSpendCents([])).toBe(0);
  });

  it("stays in integers — never a float", () => {
    const total = lessonSpendCents([
      makeLesson({ cost_cents: 9999 }),
      makeLesson({ cost_cents: 1 }),
    ]);
    expect(Number.isInteger(total)).toBe(true);
    expect(total).toBe(10000);
  });
});

describe("outstandingHomework", () => {
  const withHomework = (
    occurred_on: string,
    homework_done: "yes" | "partly" | "no" | null,
  ) =>
    makeLesson({
      occurred_on,
      homework_target: "5 sessions before the next lesson",
      homework_done,
    });

  it("returns the most recent lesson when its homework isn't done", () => {
    const latest = withHomework("2026-03-12", "no");
    const result = outstandingHomework([
      withHomework("2026-01-15", "yes"),
      latest,
    ]);
    expect(result?.id).toBe(latest.id);
  });

  it("counts an unanswered status as outstanding — nobody has said either way", () => {
    const latest = withHomework("2026-03-12", null);
    expect(outstandingHomework([latest])?.id).toBe(latest.id);
  });

  it("counts partly done as outstanding", () => {
    const latest = withHomework("2026-03-12", "partly");
    expect(outstandingHomework([latest])?.id).toBe(latest.id);
  });

  it("returns null when the most recent lesson's homework is done", () => {
    expect(outstandingHomework([withHomework("2026-03-12", "yes")])).toBeNull();
  });

  it("returns null when the most recent lesson set no homework", () => {
    const latest = makeLesson({
      occurred_on: "2026-03-12",
      homework_target: null,
      homework_done: null,
    });
    expect(outstandingHomework([latest])).toBeNull();
  });

  it("treats a whitespace-only target as no homework", () => {
    const latest = makeLesson({
      occurred_on: "2026-03-12",
      homework_target: "   ",
      homework_done: "no",
    });
    expect(outstandingHomework([latest])).toBeNull();
  });

  it("is superseded by the next lesson — an older unfinished drill is not surfaced", () => {
    // The January homework was never done, but the athlete has seen the coach
    // since and that conversation set the plan. Nothing is outstanding.
    const lessons = [
      withHomework("2026-01-15", "no"),
      withHomework("2026-03-12", "yes"),
    ];
    expect(outstandingHomework(lessons)).toBeNull();
  });

  it("is superseded even when the newer lesson assigned nothing", () => {
    const lessons = [
      withHomework("2026-01-15", "no"),
      makeLesson({ occurred_on: "2026-03-12", homework_target: null }),
    ];
    expect(outstandingHomework(lessons)).toBeNull();
  });

  it("finds the most recent lesson regardless of array order", () => {
    const latest = withHomework("2026-03-12", "no");
    const result = outstandingHomework([
      latest,
      withHomework("2025-11-20", "yes"),
      withHomework("2026-01-15", "yes"),
    ]);
    expect(result?.id).toBe(latest.id);
  });

  it("breaks a same-day tie by insertion order, newest first", () => {
    const earlier = makeLesson({
      occurred_on: "2026-03-12",
      created_at: "2026-03-12T09:00:00Z",
      homework_target: "Gate drill",
      homework_done: "no",
    });
    const later = makeLesson({
      occurred_on: "2026-03-12",
      created_at: "2026-03-12T17:00:00Z",
      homework_target: "Gate drill",
      homework_done: "yes",
    });
    // The later-logged lesson wins, so its "done" is the answer.
    expect(outstandingHomework([earlier, later])).toBeNull();
    expect(outstandingHomework([later, earlier])).toBeNull();
  });

  it("returns null for no lessons", () => {
    expect(outstandingHomework([])).toBeNull();
  });

  it("does not mutate the array it is given", () => {
    const lessons = [
      withHomework("2025-11-20", "yes"),
      withHomework("2026-03-12", "no"),
    ];
    const order = lessons.map((l) => l.id);
    outstandingHomework(lessons);
    expect(lessons.map((l) => l.id)).toEqual(order);
  });
});
