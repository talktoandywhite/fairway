import { describe, expect, it } from "vitest";

import {
  homeworkPrompt,
  homeworkStatusLabel,
  lessonListTitle,
  lessonSummary,
  lessonTitle,
} from "@/lib/lessons/present";
import { makeLesson } from "@/lib/stats/__tests__/fixtures/factories";

describe("homeworkStatusLabel", () => {
  it("labels the three stored states in the athlete's words", () => {
    expect(homeworkStatusLabel("yes")).toBe("Done");
    expect(homeworkStatusLabel("partly")).toBe("Partly done");
    // "Not yet", never "No" — homework that hasn't happened is a thing to go do.
    expect(homeworkStatusLabel("no")).toBe("Not yet");
  });

  it("distinguishes 'not answered' from 'not done'", () => {
    expect(homeworkStatusLabel(null)).toBe("Not answered");
    expect(homeworkStatusLabel(null)).not.toBe(homeworkStatusLabel("no"));
  });
});

describe("homeworkPrompt", () => {
  const lesson = (partial = {}) =>
    makeLesson({
      occurred_on: "2026-03-12",
      coach_name: "Coach Diaz",
      drill_assigned: "Gate drill from 4 ft, 20 makes",
      homework_target: "Every practice for 3 weeks",
      homework_done: null,
      ...partial,
    });

  it("names the coach who set the homework", () => {
    expect(homeworkPrompt(lesson()).title).toBe("Homework from Coach Diaz");
  });

  it("falls back to a coach-less title rather than an empty one", () => {
    expect(homeworkPrompt(lesson({ coach_name: null })).title).toBe(
      "Homework from your last lesson",
    );
    expect(homeworkPrompt(lesson({ coach_name: "   " })).title).toBe(
      "Homework from your last lesson",
    );
  });

  it("asks rather than assumes when the status was never answered", () => {
    const prompt = homeworkPrompt(lesson({ homework_done: null }));
    expect(prompt.sentence).toContain("haven't said how it's going");
    expect(prompt.status).toBeNull();
  });

  it("credits the work already done when it's partly complete", () => {
    const prompt = homeworkPrompt(lesson({ homework_done: "partly" }));
    expect(prompt.sentence).toContain("partway through");
  });

  it("states the fact and points forward when it hasn't happened", () => {
    const prompt = homeworkPrompt(lesson({ homework_done: "no" }));
    expect(prompt.sentence).toContain("still waiting");
  });

  it("never scolds, in any state", () => {
    const scolding =
      /overdue|late|failed|behind|missed|you should have|why haven't/i;
    for (const status of ["no", "partly", null] as const) {
      expect(
        homeworkPrompt(lesson({ homework_done: status })).sentence,
      ).not.toMatch(scolding);
    }
  });

  it("counts no days — a running tally of lateness is the nagging we rule out", () => {
    for (const status of ["no", "partly", null] as const) {
      const { sentence } = homeworkPrompt(lesson({ homework_done: status }));
      // The only numerals allowed are the ones in the formatted lesson date.
      expect(sentence).not.toMatch(/\b\d+ days?\b/);
    }
  });

  it("carries the drill and the target through verbatim", () => {
    const prompt = homeworkPrompt(lesson());
    expect(prompt.drill).toBe("Gate drill from 4 ft, 20 makes");
    expect(prompt.target).toBe("Every practice for 3 weeks");
    expect(prompt.occurredOn).toBe("Mar 12, 2026");
  });

  it("reports a missing drill as null rather than an empty string", () => {
    expect(homeworkPrompt(lesson({ drill_assigned: null })).drill).toBeNull();
    expect(homeworkPrompt(lesson({ drill_assigned: "  " })).drill).toBeNull();
  });
});

describe("lessonSummary", () => {
  it("prefers the swing key", () => {
    const summary = lessonSummary(
      makeLesson({
        swing_key: "Putter face square at impact",
        what_changed: "Three-putts down to two a round",
      }),
    );
    expect(summary).toBe("Putter face square at impact");
  });

  it("falls back to what changed, then to the drill", () => {
    expect(
      lessonSummary(
        makeLesson({ swing_key: null, what_changed: "Chunked chips gone" }),
      ),
    ).toBe("Chunked chips gone");
    expect(
      lessonSummary(
        makeLesson({
          swing_key: null,
          what_changed: null,
          drill_assigned: "Towel-under-ball chipping",
        }),
      ),
    ).toBe("Towel-under-ball chipping");
  });

  it("returns null when the athlete wrote nothing — no blank subtitle line", () => {
    expect(lessonSummary(makeLesson())).toBeNull();
    expect(lessonSummary(makeLesson({ swing_key: "   " }))).toBeNull();
  });
});

describe("lessonTitle", () => {
  it("names the coach when there is one", () => {
    expect(lessonTitle("Coach Diaz")).toBe("Lesson with Coach Diaz");
  });

  it("never renders an empty heading", () => {
    expect(lessonTitle(null)).toBe("Lesson");
    expect(lessonTitle("  ")).toBe("Lesson");
  });
});

describe("lessonListTitle", () => {
  it("is the coach's name alone — the row has no budget for a shared prefix", () => {
    expect(lessonListTitle("Coach Diaz")).toBe("Coach Diaz");
    // The whole reason it exists: at 375px the full title truncated to
    // "Lesson with C…", cutting the only part that differs between rows.
    expect(lessonListTitle("Coach Diaz").length).toBeLessThan(
      lessonTitle("Coach Diaz").length,
    );
  });

  it("never renders an empty row title", () => {
    expect(lessonListTitle(null)).toBe("Lesson");
    expect(lessonListTitle("   ")).toBe("Lesson");
  });
});
