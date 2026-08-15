import { describe, expect, it } from "vitest";

import { SESSION_TYPES } from "@/lib/stats";
import type { SessionType } from "@/lib/stats";

import {
  DEFAULT_WINDOW,
  MIN_MIX_MINUTES,
  OUTSIDE_MIX_TYPES,
  PRACTICE_BANDS,
  PRACTICE_WINDOWS,
  RATIO_BUCKETS,
  bandForLevel,
  bandForScoringAverage,
  buildRollup,
  parseWindow,
  ratioCheck,
  sessionsInWindow,
  windowStartIso,
} from "./present";

/**
 * The Practice Log's arrangement and its verdict, pinned.
 *
 * The stakes: the ratio check is the one place in the app that tells an athlete
 * their practice is going to the wrong place, so it must be right about the
 * arithmetic, honest about its basis, and never say something scolding or
 * ungrounded. The last describe block asserts the grounding property directly —
 * every numeral in the sentence is a numeral the UI renders beside it.
 */

/** A minimal session; only the fields the pure functions read. */
function s(
  session_type: SessionType,
  minutes: number,
  occurred_on = "2026-05-01",
) {
  return { session_type, minutes, occurred_on };
}

/**
 * Narrow away a null/undefined by failing the test, rather than reaching for a
 * non-null assertion (the lint rule forbids `!`, and a named failure reads far
 * better than a null dereference three lines later).
 */
function must<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) {
    throw new Error(`expected ${what} to exist`);
  }
  return value;
}

// --------------------------------------------------------------------------
// Window
// --------------------------------------------------------------------------

describe("parseWindow", () => {
  it("resolves each known value", () => {
    for (const w of PRACTICE_WINDOWS) {
      expect(parseWindow(w.value)).toBe(w);
    }
  });

  it("falls back to the default for anything unrecognised", () => {
    expect(parseWindow(undefined)).toBe(DEFAULT_WINDOW);
    expect(parseWindow("")).toBe(DEFAULT_WINDOW);
    expect(parseWindow("365")).toBe(DEFAULT_WINDOW);
    expect(parseWindow("'; drop table")).toBe(DEFAULT_WINDOW);
  });

  it("takes the first value when the param repeats", () => {
    expect(parseWindow(["7", "90"]).value).toBe("7");
  });
});

describe("windowStartIso", () => {
  it("counts today as day one of the window", () => {
    expect(windowStartIso("2026-05-10", 7)).toBe("2026-05-04");
    expect(windowStartIso("2026-05-10", 1)).toBe("2026-05-10");
    expect(windowStartIso("2026-05-10", 30)).toBe("2026-04-11");
  });

  it("crosses a month and a year boundary correctly", () => {
    expect(windowStartIso("2026-03-01", 7)).toBe("2026-02-23");
    expect(windowStartIso("2026-01-03", 7)).toBe("2025-12-28");
  });

  it("handles a leap day", () => {
    expect(windowStartIso("2028-03-01", 2)).toBe("2028-02-29");
  });
});

describe("sessionsInWindow", () => {
  const sessions = [
    s("putting", 30, "2026-05-10"), // today
    s("putting", 30, "2026-05-04"), // first day of a 7-day window
    s("putting", 30, "2026-05-03"), // one day outside it
    s("putting", 30, "2025-12-01"), // long ago
  ];

  it("includes both ends of the window", () => {
    const kept = sessionsInWindow(sessions, "2026-05-10", PRACTICE_WINDOWS[0]);
    expect(kept.map((x) => x.occurred_on)).toEqual([
      "2026-05-10",
      "2026-05-04",
    ]);
  });

  it("keeps everything for the all-time window", () => {
    const all = must(
      PRACTICE_WINDOWS.find((w) => w.value === "all"),
      "the all-time window",
    );
    expect(sessionsInWindow(sessions, "2026-05-10", all)).toHaveLength(4);
  });
});

// --------------------------------------------------------------------------
// Rollup
// --------------------------------------------------------------------------

describe("buildRollup", () => {
  it("reports every session type, including the ones at zero", () => {
    const rollup = buildRollup([s("putting", 45)]);
    expect(rollup.rows).toHaveLength(SESSION_TYPES.length);
    expect(rollup.rows.map((r) => r.type)).toEqual([...SESSION_TYPES]);
    expect(
      must(
        rollup.rows.find((r) => r.type === "exercise"),
        "the exercise row",
      ).minutes,
    ).toBe(0);
  });

  it("sums minutes and shares over the window", () => {
    const rollup = buildRollup([
      s("putting", 30),
      s("putting", 30),
      s("range_full_swing", 60),
      s("exercise", 60),
    ]);
    expect(rollup.totalMinutes).toBe(180);
    expect(rollup.segmentCount).toBe(4);
    expect(
      must(
        rollup.rows.find((r) => r.type === "putting"),
        "the putting row",
      ).share,
    ).toBeCloseTo(60 / 180);
  });

  it("pins each type to its fixed chart slot regardless of what is logged", () => {
    const full = buildRollup(SESSION_TYPES.map((t) => s(t, 30)));
    const sparse = buildRollup([s("lesson", 30), s("exercise", 30)]);
    for (const type of SESSION_TYPES) {
      const a = must(
        full.rows.find((r) => r.type === type),
        `${type} (full)`,
      );
      const b = must(
        sparse.rows.find((r) => r.type === type),
        `${type} (sparse)`,
      );
      expect(a.slot).toBe(b.slot);
      expect(a.slot).toBe(SESSION_TYPES.indexOf(type));
    }
  });

  it("orders loggedRows biggest-first and drops the empty types", () => {
    const rollup = buildRollup([
      s("putting", 30),
      s("short_game", 90),
      s("exercise", 60),
    ]);
    expect(rollup.loggedRows.map((r) => r.type)).toEqual([
      "short_game",
      "exercise",
      "putting",
    ]);
  });

  it("returns zeroed shares rather than NaN when nothing is logged", () => {
    const rollup = buildRollup([]);
    expect(rollup.totalMinutes).toBe(0);
    expect(rollup.loggedRows).toEqual([]);
    for (const row of rollup.rows) expect(row.share).toBe(0);
  });
});

// --------------------------------------------------------------------------
// Bands
// --------------------------------------------------------------------------

describe("practice bands", () => {
  it("covers every session type exactly once across the mix and the exclusions", () => {
    const inMix = RATIO_BUCKETS.flatMap((b) => [...b.types]);
    const all = [...inMix, ...OUTSIDE_MIX_TYPES].sort();
    expect(all).toEqual([...SESSION_TYPES].sort());
    expect(new Set(all).size).toBe(SESSION_TYPES.length);
  });

  it("excludes exercise and lesson from the mix", () => {
    expect([...OUTSIDE_MIX_TYPES].sort()).toEqual(["exercise", "lesson"]);
  });

  it("leaves an achievable in-range mix in every band", () => {
    // Minimums must fit inside 100% and maximums must be able to fill it,
    // otherwise a band would be impossible to satisfy and the check would nag
    // an athlete who is doing everything right.
    for (const band of Object.values(PRACTICE_BANDS)) {
      const targets = Object.values(band.targets);
      const minSum = targets.reduce((a, t) => a + t.min, 0);
      const maxSum = targets.reduce((a, t) => a + t.max, 0);
      expect(minSum).toBeLessThanOrEqual(1);
      expect(maxSum).toBeGreaterThanOrEqual(1);
      for (const t of targets) expect(t.min).toBeLessThan(t.max);
    }
  });

  it("weights the scoring game more heavily the higher the score", () => {
    const mins = [
      PRACTICE_BANDS.under_80,
      PRACTICE_BANDS.eighties,
      PRACTICE_BANDS.nineties,
      PRACTICE_BANDS.over_100,
    ].map((b) => b.targets.scoring.min);
    // Strictly increasing: already sorted ascending, and no repeats.
    expect([...mins].sort((a, b) => a - b)).toEqual(mins);
    expect(new Set(mins).size).toBe(mins.length);
  });

  it("picks the band from the scoring average at each boundary", () => {
    expect(bandForScoringAverage(113).key).toBe("over_100");
    expect(bandForScoringAverage(100).key).toBe("over_100");
    expect(bandForScoringAverage(99.9).key).toBe("nineties");
    expect(bandForScoringAverage(90).key).toBe("nineties");
    expect(bandForScoringAverage(89.9).key).toBe("eighties");
    expect(bandForScoringAverage(80).key).toBe("eighties");
    expect(bandForScoringAverage(79.9).key).toBe("under_80");
    expect(bandForScoringAverage(68).key).toBe("under_80");
  });

  it("falls back to the athlete's level when there is no scoring average", () => {
    expect(bandForLevel("junior").key).toBe("over_100");
    expect(bandForLevel("high_school").key).toBe("nineties");
    expect(bandForLevel("college").key).toBe("eighties");
  });
});

// --------------------------------------------------------------------------
// The ratio check
// --------------------------------------------------------------------------

describe("ratioCheck", () => {
  const level = "high_school" as const;

  it("returns null when the window holds no mix minutes at all", () => {
    expect(ratioCheck([], { scoringAverage: 113, level })).toBeNull();
    // Gym-only is not a practice mix — there is nothing to have an opinion about.
    expect(
      ratioCheck([s("exercise", 300)], { scoringAverage: 113, level }),
    ).toBeNull();
  });

  it("takes shares over the mix only, leaving exercise and lesson out of the denominator", () => {
    const check = must(
      ratioCheck(
        [s("putting", 100), s("range_full_swing", 100), s("exercise", 800)],
        { scoringAverage: 113, level },
      ),
      "a ratio check",
    );
    expect(check.mixMinutes).toBe(200);
    expect(check.outsideMinutes).toBe(800);
    expect(
      must(
        check.buckets.find((b) => b.key === "scoring"),
        "the scoring bucket",
      ).share,
    ).toBeCloseTo(0.5);
  });

  it("uses the scoring average when there is one, and says so", () => {
    const check = must(
      ratioCheck([s("putting", 300)], {
        scoringAverage: 113,
        level: "college",
      }),
      "a ratio check",
    );
    expect(check.basis).toBe("scoring_average");
    expect(check.band.key).toBe("over_100");
    expect(check.scoringAverage).toBe(113);
  });

  it("falls back to level, and reports the weaker basis honestly", () => {
    const check = must(
      ratioCheck([s("putting", 300)], {
        scoringAverage: null,
        level: "college",
      }),
      "a ratio check",
    );
    expect(check.basis).toBe("level");
    expect(check.band.key).toBe("eighties");
    expect(check.scoringAverage).toBeNull();
  });

  it("marks each bucket below / in range / above against the band", () => {
    // 113 shooter, over_100 band: scoring 55-70%, full swing 10-25%.
    const check = must(
      ratioCheck([s("short_game", 100), s("range_full_swing", 300)], {
        scoringAverage: 113,
        level,
      }),
      "a ratio check",
    );
    const verdictFor = (key: string) =>
      check.buckets.find((b) => b.key === key)?.verdict;
    expect(verdictFor("scoring")).toBe("below"); // 25%
    expect(verdictFor("full_swing")).toBe("above"); // 75%
    expect(verdictFor("on_course")).toBe("below"); // 0%
  });

  it("treats a share exactly on a boundary as in range", () => {
    // over_100 scoring target is 55-70%; 55% of 400 is 220.
    const check = must(
      ratioCheck(
        [s("putting", 220), s("range_full_swing", 90), s("on_course", 90)],
        { scoringAverage: 113, level },
      ),
      "a ratio check",
    );
    expect(
      must(
        check.buckets.find((b) => b.key === "scoring"),
        "the scoring bucket",
      ).verdict,
    ).toBe("in_range");
  });

  it("holds its verdict when there is too little logged to read a mix", () => {
    const check = must(
      ratioCheck([s("putting", 60)], {
        scoringAverage: 113,
        level,
      }),
      "a ratio check",
    );
    expect(check.mixMinutes).toBeLessThan(MIN_MIX_MINUTES);
    expect(check.hasEnoughData).toBe(false);
    expect(check.headline).toContain("not yet enough to read");
  });
});

describe("ratioCheck — the headline", () => {
  const level = "high_school" as const;

  it("names the backwards mix the workbook was built to catch", () => {
    // The reference case: a 113 shooter whose practice is mostly full swing.
    const check = must(
      ratioCheck(
        [s("range_full_swing", 300), s("short_game", 60), s("on_course", 60)],
        { scoringAverage: 113, level },
      ),
      "a ratio check",
    );
    expect(check.headline).toContain("Full swing is taking 71%");
    expect(check.headline).toContain("scoring game gets 14%");
    expect(check.headline).toContain("inside 100 yards");
    expect(check.headline).toContain("55–70%");
  });

  it("affirms a mix that is already right", () => {
    const check = must(
      ratioCheck(
        [
          s("short_game", 400),
          s("putting", 200),
          s("range_full_swing", 200),
          s("on_course", 200),
        ],
        { scoringAverage: 113, level },
      ),
      "a ratio check",
    );
    expect(check.buckets.every((b) => b.verdict === "in_range")).toBe(true);
    expect(check.headline).toContain("right where it should be");
    expect(check.headline).toContain("Keep it there");
  });

  it("does not scold an athlete who over-invests in the scoring game", () => {
    const check = must(
      ratioCheck([s("putting", 500), s("range_full_swing", 30)], {
        scoringAverage: 113,
        level,
      }),
      "a ratio check",
    );
    expect(
      must(
        check.buckets.find((b) => b.key === "scoring"),
        "the scoring bucket",
      ).verdict,
    ).toBe("above");
    expect(check.headline).toContain("right thing to lean into");
  });

  it("never uses shaming language, in any reachable case", () => {
    const cases = [
      [s("range_full_swing", 400), s("putting", 40)],
      [s("putting", 400), s("range_full_swing", 40)],
      [s("short_game", 300), s("range_full_swing", 150), s("on_course", 150)],
      [s("short_game", 300), s("range_full_swing", 250), s("on_course", 50)],
      [s("short_game", 400), s("range_full_swing", 60), s("on_course", 140)],
      [s("on_course", 500), s("short_game", 300), s("range_full_swing", 100)],
      [s("putting", 30)],
    ];
    const banned =
      /\b(bad|wrong|fail(ing|ed)?|lazy|should have|too little|neglect|waste|only ever|stop)\b/i;
    for (const sessions of cases) {
      for (const scoringAverage of [113, 95, 84, 74, null]) {
        const check = must(
          ratioCheck(sessions, { scoringAverage, level }),
          "a ratio check",
        );
        expect(check.headline).not.toMatch(banned);
        expect(check.headline.length).toBeGreaterThan(40);
      }
    }
  });

  it("states no number that isn't rendered beside it (the grounding property)", () => {
    // Every numeral in the sentence must be one of: a bucket's own share, a
    // target bound, the mix-minutes figure, or a numeral belonging to the band
    // label the UI prints ("scoring in the 90s") — all of which the UI shows.
    const cases = [
      [s("range_full_swing", 400), s("putting", 40)],
      [s("putting", 400), s("range_full_swing", 40)],
      [s("short_game", 300), s("range_full_swing", 150), s("on_course", 150)],
      [s("short_game", 400), s("range_full_swing", 60), s("on_course", 140)],
      [s("on_course", 500), s("short_game", 300), s("range_full_swing", 100)],
      [s("putting", 30)],
    ];
    for (const sessions of cases) {
      for (const scoringAverage of [113, 95, 84, 74, null]) {
        const check = must(
          ratioCheck(sessions, { scoringAverage, level }),
          "a ratio check",
        );
        const allowed = new Set<number>([100]); // "inside 100 yards", a fixed phrase
        for (const numeral of check.band.label.match(/\d+/g) ?? []) {
          allowed.add(Number(numeral));
        }
        for (const b of check.buckets) {
          allowed.add(Math.round(b.share * 100));
          allowed.add(Math.round(b.target.min * 100));
          allowed.add(Math.round(b.target.max * 100));
        }
        allowed.add(check.mixMinutes);
        allowed.add(Math.floor(check.mixMinutes / 60));
        allowed.add(check.mixMinutes % 60);
        for (const numeral of check.headline.match(/\d+/g) ?? []) {
          expect(allowed).toContain(Number(numeral));
        }
      }
    }
  });
});
