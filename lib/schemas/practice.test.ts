import { describe, expect, it } from "vitest";

import { SESSION_TYPES } from "@/lib/stats";

import {
  SESSION_TYPE_HINTS,
  SESSION_TYPE_LABELS,
  emptySegment,
  practiceSchema,
  totalMinutes,
} from "./practice";

/**
 * The practice schema's contract, pinned.
 *
 * What matters here: a session holds one or more segments, every segment carries
 * its OWN required positive minutes (the rollup and the ratio check are only as
 * honest as that field, and nothing in this app ever divides a session total
 * between disciplines), a discipline can't appear twice in one session, blank
 * optional fields store `null` rather than "", and a future date is refused
 * because practice is done, then logged.
 */

/** A complete, valid raw input — tests override just the field under test. */
function raw(partial: Record<string, unknown> = {}) {
  return {
    occurred_on: "2026-04-06",
    notes: null,
    segments: [
      {
        session_type: "putting",
        minutes: "45",
        focus: "Speed control",
        drill: "Lag ladder to 20/30/40 ft",
        result: "3 of 9 inside the leather",
      },
    ],
    ...partial,
  };
}

/** A minimal valid segment. */
function seg(session_type: string, minutes: string | number) {
  return { session_type, minutes, focus: null, drill: null, result: null };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** `offset` days from today as a `YYYY-MM-DD` UTC calendar day. */
function dayFromToday(offset: number): string {
  const ms = Date.parse(`${todayIso()}T00:00:00Z`) + offset * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** The first field error at a Zod path, e.g. `segments.0.minutes`. */
function errorAt(
  result: ReturnType<typeof practiceSchema.safeParse>,
  path: string,
): string | undefined {
  if (result.success) return undefined;
  return result.error.issues.find((i) => i.path.join(".") === path)?.message;
}

describe("practiceSchema — segments", () => {
  it("accepts a multi-discipline session and keeps each discipline's own minutes", () => {
    const parsed = practiceSchema.parse(
      raw({
        segments: [
          seg("exercise", "45"),
          seg("range_full_swing", "30"),
          seg("short_game", "45"),
          seg("putting", "30"),
        ],
      }),
    );
    expect(parsed.segments).toHaveLength(4);
    expect(parsed.segments.map((s) => s.minutes)).toEqual([45, 30, 45, 30]);
    // The whole point: 150 minutes stayed as four numbers the athlete typed,
    // never one total to be divided back out.
    expect(totalMinutes(parsed.segments)).toBe(150);
  });

  it("requires at least one discipline", () => {
    const parsed = practiceSchema.safeParse(raw({ segments: [] }));
    expect(parsed.success).toBe(false);
    expect(errorAt(parsed, "segments")).toBe(
      "Pick at least one thing you worked on",
    );
  });

  it("refuses the same discipline twice in one session", () => {
    const parsed = practiceSchema.safeParse(
      raw({ segments: [seg("putting", "30"), seg("putting", "20")] }),
    );
    expect(parsed.success).toBe(false);
    expect(errorAt(parsed, "segments")).toBe(
      "Each discipline can only be logged once per session",
    );
  });

  it("reports a bad minute value against its own segment", () => {
    const parsed = practiceSchema.safeParse(
      raw({ segments: [seg("putting", "45"), seg("short_game", "")] }),
    );
    expect(parsed.success).toBe(false);
    // Path-scoped, so the form can put the message on the right box.
    expect(errorAt(parsed, "segments.1.minutes")).toBe("Enter the minutes");
    expect(errorAt(parsed, "segments.0.minutes")).toBeUndefined();
  });

  it("accepts every enum member as a discipline", () => {
    for (const type of SESSION_TYPES) {
      expect(
        practiceSchema.safeParse(raw({ segments: [seg(type, "30")] })).success,
      ).toBe(true);
    }
  });

  it("refuses a discipline outside the enum", () => {
    expect(
      practiceSchema.safeParse(raw({ segments: [seg("range", "30")] })).success,
    ).toBe(false);
  });

  it("labels and hints cover every discipline", () => {
    for (const type of SESSION_TYPES) {
      expect(SESSION_TYPE_LABELS[type]).toBeTruthy();
      expect(SESSION_TYPE_HINTS[type]).toBeTruthy();
    }
  });
});

describe("practiceSchema — minutes", () => {
  it("coerces the form's string to an integer", () => {
    expect(
      practiceSchema.parse(raw({ segments: [seg("putting", "45")] }))
        .segments[0]?.minutes,
    ).toBe(45);
    expect(
      practiceSchema.parse(raw({ segments: [seg("putting", 90)] })).segments[0]
        ?.minutes,
    ).toBe(90);
  });

  it("rejects a blank as required, never coercing it to 0", () => {
    for (const empty of ["", "   ", null, undefined]) {
      const parsed = practiceSchema.safeParse(
        raw({ segments: [seg("putting", empty as never)] }),
      );
      expect(parsed.success).toBe(false);
      expect(errorAt(parsed, "segments.0.minutes")).toBe("Enter the minutes");
    }
  });

  it("rejects zero and negative minutes (the DB check agrees)", () => {
    expect(
      practiceSchema.safeParse(raw({ segments: [seg("putting", "0")] }))
        .success,
    ).toBe(false);
    expect(
      practiceSchema.safeParse(raw({ segments: [seg("putting", "-30")] }))
        .success,
    ).toBe(false);
  });

  it("rejects a fractional minute", () => {
    expect(
      practiceSchema.safeParse(raw({ segments: [seg("putting", "45.5")] }))
        .success,
    ).toBe(false);
  });

  it("caps one discipline at ten hours", () => {
    expect(
      practiceSchema.safeParse(raw({ segments: [seg("putting", "600")] }))
        .success,
    ).toBe(true);
    expect(
      practiceSchema.safeParse(raw({ segments: [seg("putting", "601")] }))
        .success,
    ).toBe(false);
  });
});

describe("practiceSchema — optional text", () => {
  it("stores a blank optional field as null, not an empty string", () => {
    const parsed = practiceSchema.parse(
      raw({
        notes: "   ",
        segments: [
          {
            session_type: "putting",
            minutes: "45",
            focus: "",
            drill: "   ",
            result: null,
          },
        ],
      }),
    );
    expect(parsed.notes).toBeNull();
    expect(parsed.segments[0]?.focus).toBeNull();
    expect(parsed.segments[0]?.drill).toBeNull();
    expect(parsed.segments[0]?.result).toBeNull();
  });

  it("trims what it keeps", () => {
    const parsed = practiceSchema.parse(
      raw({
        segments: [
          {
            session_type: "putting",
            minutes: "45",
            focus: "  Speed  ",
            drill: null,
            result: null,
          },
        ],
      }),
    );
    expect(parsed.segments[0]?.focus).toBe("Speed");
  });

  it("rejects an over-long field rather than silently truncating", () => {
    expect(
      practiceSchema.safeParse(
        raw({
          segments: [
            {
              session_type: "putting",
              minutes: "45",
              focus: "x".repeat(121),
              drill: null,
              result: null,
            },
          ],
        }),
      ).success,
    ).toBe(false);
    expect(
      practiceSchema.safeParse(raw({ notes: "x".repeat(2001) })).success,
    ).toBe(false);
  });
});

describe("practiceSchema — occurred_on", () => {
  it("accepts today and the past", () => {
    expect(
      practiceSchema.safeParse(raw({ occurred_on: todayIso() })).success,
    ).toBe(true);
    expect(
      practiceSchema.safeParse(raw({ occurred_on: dayFromToday(-400) }))
        .success,
    ).toBe(true);
  });

  it("refuses a future date — practice is done, then logged", () => {
    const parsed = practiceSchema.safeParse(
      raw({ occurred_on: dayFromToday(1) }),
    );
    expect(parsed.success).toBe(false);
    expect(errorAt(parsed, "occurred_on")).toBe("That date is in the future");
  });

  it("refuses a malformed date", () => {
    expect(
      practiceSchema.safeParse(raw({ occurred_on: "04/06/2026" })).success,
    ).toBe(false);
    expect(
      practiceSchema.safeParse(raw({ occurred_on: "2026-13-01" })).success,
    ).toBe(false);
  });
});

describe("emptySegment / totalMinutes", () => {
  it("starts a newly-picked discipline with no minutes, not zero minutes", () => {
    // "" is "nothing entered yet" and fails as required; 0 would be a claim.
    expect(emptySegment("putting")).toEqual({
      session_type: "putting",
      minutes: "",
      focus: null,
      drill: null,
      result: null,
    });
  });

  it("sums a half-filled form without producing NaN", () => {
    expect(
      totalMinutes([{ minutes: "45" }, { minutes: "" }, { minutes: "30" }]),
    ).toBe(75);
    expect(totalMinutes([])).toBe(0);
    expect(totalMinutes([{ minutes: "abc" }])).toBe(0);
  });
});
