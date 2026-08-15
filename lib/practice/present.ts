import { minutesByType, SESSION_TYPES } from "@/lib/stats";
import type { SessionType, SessionTypeTotals } from "@/lib/stats";
import { SESSION_TYPE_LABELS } from "@/lib/schemas/practice";
import type { Database } from "@/types/database";

import { formatMinutes, formatShare, formatShareRange } from "./format";

/**
 * Pure presentation and judgement logic for the Practice Log — kept out of
 * components so it is unit-testable without a database or React (the Session
 * 9/10 pattern). It does not recompute a metric the engine owns: the
 * minutes-by-type totals come from `lib/stats/practice`, and everything here is
 * arrangement (windowing, rollup rows) or the VERDICT the engine deliberately
 * stopped short of — see the note at the top of `lib/stats/practice.ts`, which
 * hands the "is this mix right?" question to this session.
 *
 * The verdict is deterministic and grounded: every number that appears in the
 * prose is one of the numbers rendered on the bars beside it, formatted by the
 * same function. Nothing here is generated, and the AI layer never touches it.
 */

type AthleteLevel = Database["public"]["Enums"]["athlete_level"];

// --------------------------------------------------------------------------
// The selectable window
// --------------------------------------------------------------------------

/**
 * The rollup windows. Short enough that a change in habit shows up (7 days),
 * long enough to read a real mix (90 days), plus all-time for the season view.
 * `days: null` means unbounded.
 *
 * A window of N days is the N-day span ENDING TODAY, inclusive — "7 days" is
 * today plus the six before it, not today plus seven.
 */
export const PRACTICE_WINDOWS = [
  { value: "7", label: "7 days", days: 7 },
  { value: "30", label: "30 days", days: 30 },
  { value: "90", label: "90 days", days: 90 },
  { value: "all", label: "All time", days: null },
] as const;

export type PracticeWindow = (typeof PRACTICE_WINDOWS)[number];
export type PracticeWindowValue = PracticeWindow["value"];

/** 30 days — long enough to read a mix, short enough to reflect this month's
 * habits rather than last season's. */
export const DEFAULT_WINDOW: PracticeWindow = PRACTICE_WINDOWS[1];

/**
 * Resolve the `?window=` search param to a window. Anything unrecognised (a
 * hand-edited URL, a stale bookmark) falls back to the default rather than
 * erroring — a bad query string should never break the page.
 */
export function parseWindow(
  raw: string | string[] | undefined,
): PracticeWindow {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return PRACTICE_WINDOWS.find((w) => w.value === value) ?? DEFAULT_WINDOW;
}

/**
 * The inclusive first day of an N-day window ending on `todayIso`, as
 * `YYYY-MM-DD`. Computed at UTC midnight so the result is an exact calendar day,
 * matching how the dates are stored and how `lib/stats` does its date math.
 */
export function windowStartIso(todayIso: string, days: number): string {
  const MS_PER_DAY = 86_400_000;
  const start = Date.parse(`${todayIso}T00:00:00Z`) - (days - 1) * MS_PER_DAY;
  return new Date(start).toISOString().slice(0, 10);
}

/** The sessions falling inside a window. Generic over the row shape so it runs
 * on full rows in the page and on plain fixtures in tests. Future-dated rows
 * cannot exist (the schema forbids them), so this only bounds the past. */
export function sessionsInWindow<T extends { occurred_on: string }>(
  sessions: T[],
  todayIso: string,
  window: PracticeWindow,
): T[] {
  if (window.days === null) return sessions;
  const start = windowStartIso(todayIso, window.days);
  return sessions.filter((s) => s.occurred_on >= start);
}

// --------------------------------------------------------------------------
// The minutes-by-type rollup
// --------------------------------------------------------------------------

/** One row of the rollup: a session type, its minutes, and its share of the
 * window's total. `slot` is the type's FIXED position in `SESSION_TYPES`, which
 * is the chart slot it wears — so filtering the window can never repaint a
 * surviving category (DESIGN.md §3). */
export interface RollupRow {
  type: SessionType;
  label: string;
  minutes: number;
  /** Share of all logged minutes in the window, 0..1. 0 when nothing is logged. */
  share: number;
  /** 0-based chart slot, fixed per type and never reassigned. */
  slot: number;
}

export interface Rollup {
  /** Every session type, in enum order — including the ones at zero. */
  rows: RollupRow[];
  /** Only the types with time on them, biggest first. What the chart draws. */
  loggedRows: RollupRow[];
  totalMinutes: number;
  sessionCount: number;
}

/**
 * The minutes-by-type rollup over an already-windowed set of sessions. The
 * totals come from the engine's `minutesByType`; what this adds is the share,
 * the fixed chart slot, and the two orderings the UI needs (enum order for a
 * stable table, minutes-descending for the chart).
 */
export function buildRollup(
  sessions: { session_type: SessionType; minutes: number }[],
): Rollup {
  // `minutesByType` takes the full row type; it only reads these two fields, and
  // widening here keeps callers from having to fabricate whole rows in tests.
  const totals = minutesByType(
    sessions as Parameters<typeof minutesByType>[0],
  ) as SessionTypeTotals;

  const totalMinutes = SESSION_TYPES.reduce((sum, t) => sum + totals[t], 0);

  const rows: RollupRow[] = SESSION_TYPES.map((type, slot) => ({
    type,
    label: SESSION_TYPE_LABELS[type],
    minutes: totals[type],
    share: totalMinutes === 0 ? 0 : totals[type] / totalMinutes,
    slot,
  }));

  return {
    rows,
    loggedRows: rows
      .filter((r) => r.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes),
    totalMinutes,
    sessionCount: sessions.length,
  };
}

// --------------------------------------------------------------------------
// The ratio check — the workbook's insight, made mechanical
// --------------------------------------------------------------------------

/**
 * The three buckets the mix is judged in. Seven session types is too fine a grain
 * to have an honest opinion about — nobody can say whether wedges should be 12%
 * or 18% — but the split between "the scoring game", "the full swing", and
 * "actually playing" is exactly the split the workbook cared about.
 *
 * `gym` and `lesson` are deliberately OUTSIDE the mix. Strength work is a
 * different budget entirely (and is written here by the Session 13 strength log,
 * not by a practice choice), and lesson time is the coach's plan, not the
 * athlete's allocation. Counting either would make a well-programmed athlete look
 * like they neglect their short game. Their minutes still appear in the rollup —
 * they are just not part of the ratio's denominator, and the UI says so.
 */
export const RATIO_BUCKETS = [
  {
    key: "scoring",
    label: "Scoring game",
    blurb: "Chipping, pitching, bunkers, wedges, putting",
    types: ["short_game", "putting", "range_wedges"],
  },
  {
    key: "full_swing",
    label: "Full swing",
    blurb: "Driver and irons on the range",
    types: ["range_full_swing"],
  },
  {
    key: "on_course",
    label: "On course",
    blurb: "Playing holes — where practice turns into a score",
    types: ["on_course"],
  },
] as const satisfies readonly {
  key: string;
  label: string;
  blurb: string;
  types: readonly SessionType[];
}[];

export type RatioBucketKey = (typeof RATIO_BUCKETS)[number]["key"];

/** The session types that fall outside the mix, for the UI's plain-language note. */
export const OUTSIDE_MIX_TYPES = SESSION_TYPES.filter(
  (t) =>
    !RATIO_BUCKETS.some((b) => (b.types as readonly SessionType[]).includes(t)),
);

/** A target share range for one bucket, as fractions of the mix. */
export interface BandTarget {
  min: number;
  max: number;
}

export type PracticeBandKey = "over_100" | "nineties" | "eighties" | "under_80";

export interface PracticeBand {
  key: PracticeBandKey;
  /** How the band is described in prose, e.g. "scoring in the 100s". */
  label: string;
  targets: Record<RatioBucketKey, BandTarget>;
}

/**
 * The healthy mix by scoring level — the workbook's rule, written down.
 *
 * The shape of it: the higher the score, the larger the share of strokes that
 * are being lost inside 100 yards and to penalties, and so the larger the share
 * of practice that belongs there. As scoring comes down the mix flattens, because
 * a player shooting in the 70s genuinely does lose strokes off the tee and into
 * greens. Nothing here is a hard rule — they are ranges wide enough that several
 * sane weeks all read as "in range", which is the point: the check exists to
 * catch a mix that is backwards, not to police a well-run week.
 *
 * Every band's minimums sum to less than 1 and its maximums to more than 1, so a
 * fully in-range mix is always achievable. `present.test.ts` pins that.
 */
export const PRACTICE_BANDS: Record<PracticeBandKey, PracticeBand> = {
  over_100: {
    key: "over_100",
    label: "scoring in the 100s",
    targets: {
      scoring: { min: 0.55, max: 0.7 },
      full_swing: { min: 0.1, max: 0.25 },
      // Deliberately the widest ceiling of any bucket in this band: a developing
      // player who plays a lot of golf is not doing anything that needs
      // correcting, and a check that flags them would be wrong in the way that
      // makes people stop reading it.
      on_course: { min: 0.1, max: 0.3 },
    },
  },
  nineties: {
    key: "nineties",
    label: "scoring in the 90s",
    targets: {
      scoring: { min: 0.45, max: 0.6 },
      full_swing: { min: 0.15, max: 0.3 },
      on_course: { min: 0.15, max: 0.3 },
    },
  },
  eighties: {
    key: "eighties",
    label: "scoring in the 80s",
    targets: {
      scoring: { min: 0.4, max: 0.55 },
      full_swing: { min: 0.2, max: 0.35 },
      on_course: { min: 0.15, max: 0.3 },
    },
  },
  under_80: {
    key: "under_80",
    label: "scoring in the 70s or better",
    targets: {
      scoring: { min: 0.35, max: 0.5 },
      full_swing: { min: 0.2, max: 0.35 },
      on_course: { min: 0.2, max: 0.35 },
    },
  },
};

/** The band for a scoring average — the honest basis, because it is measured. */
export function bandForScoringAverage(average: number): PracticeBand {
  if (average >= 100) return PRACTICE_BANDS.over_100;
  if (average >= 90) return PRACTICE_BANDS.nineties;
  if (average >= 80) return PRACTICE_BANDS.eighties;
  return PRACTICE_BANDS.under_80;
}

/**
 * The fallback band when there is no scoring average yet (fewer than one 18-hole
 * tournament round logged). Keyed off the athlete's competitive level, which is
 * the only other real signal on file.
 *
 * This is a weaker basis and the UI says so. It is deliberately conservative: a
 * scoring-game-heavy target is the right answer across the widest range of
 * developing players, so being wrong in this direction costs an athlete little.
 */
export function bandForLevel(level: AthleteLevel): PracticeBand {
  switch (level) {
    case "college":
      return PRACTICE_BANDS.eighties;
    case "high_school":
      return PRACTICE_BANDS.nineties;
    default:
      return PRACTICE_BANDS.over_100;
  }
}

export type BucketVerdict = "below" | "in_range" | "above";

export interface RatioBucketResult {
  key: RatioBucketKey;
  label: string;
  blurb: string;
  minutes: number;
  /** Share of the MIX (not of all logged minutes), 0..1. */
  share: number;
  target: BandTarget;
  verdict: BucketVerdict;
}

/** Where the band came from — shown to the athlete, because a benchmark you
 * can't see the basis of is just an assertion. */
export type RatioBasis = "scoring_average" | "level";

export interface RatioCheck {
  basis: RatioBasis;
  band: PracticeBand;
  /** The scoring average the band was chosen from; null when the basis is level. */
  scoringAverage: number | null;
  buckets: RatioBucketResult[];
  /** Minutes across the three buckets — the denominator of every share above. */
  mixMinutes: number;
  /** Logged minutes deliberately outside the mix (gym, lesson). */
  outsideMinutes: number;
  /** False when there is too little logged in this window to read a mix. */
  hasEnoughData: boolean;
  /** The plain sentence. Deterministic, and every numeral in it is a number
   * rendered on the bars beside it. */
  headline: string;
}

/**
 * Below this many minutes of mix time in the window, a ratio is arithmetic, not
 * a habit: one 60-minute putting session would read as "100% scoring game". The
 * check still shows the mix — it just says plainly that it is too early to call.
 */
export const MIN_MIX_MINUTES = 180;

/**
 * The ratio check. Takes an already-windowed set of sessions plus the two facts
 * that pick the band, and returns the mix, the target, and the sentence.
 *
 * Returns `null` when the window holds no mix minutes at all — there is nothing
 * to judge, and the caller shows an empty state that says what to log rather than
 * a chart of zeros (DESIGN.md §5).
 */
export function ratioCheck(
  sessions: { session_type: SessionType; minutes: number }[],
  opts: { scoringAverage: number | null; level: AthleteLevel },
): RatioCheck | null {
  const totals = minutesByType(
    sessions as Parameters<typeof minutesByType>[0],
  ) as SessionTypeTotals;

  const measured = RATIO_BUCKETS.map((bucket) => ({
    bucket,
    minutes: (bucket.types as readonly SessionType[]).reduce(
      (sum, type) => sum + totals[type],
      0,
    ),
  }));
  const mixMinutes = measured.reduce((sum, m) => sum + m.minutes, 0);
  if (mixMinutes === 0) return null;

  const outsideMinutes = OUTSIDE_MIX_TYPES.reduce(
    (sum, type) => sum + totals[type],
    0,
  );

  const basis: RatioBasis =
    opts.scoringAverage === null ? "level" : "scoring_average";
  const band =
    opts.scoringAverage === null
      ? bandForLevel(opts.level)
      : bandForScoringAverage(opts.scoringAverage);

  const buckets: RatioBucketResult[] = measured.map(({ bucket, minutes }) => {
    const share = minutes / mixMinutes;
    const target = band.targets[bucket.key];
    return {
      key: bucket.key,
      label: bucket.label,
      blurb: bucket.blurb,
      minutes,
      share,
      target,
      verdict:
        share < target.min
          ? "below"
          : share > target.max
            ? "above"
            : "in_range",
    };
  });

  const hasEnoughData = mixMinutes >= MIN_MIX_MINUTES;

  return {
    basis,
    band,
    scoringAverage: opts.scoringAverage,
    buckets,
    mixMinutes,
    outsideMinutes,
    hasEnoughData,
    headline: buildHeadline(band, buckets, mixMinutes, hasEnoughData),
  };
}

/**
 * The sentence. Ordered by what is most worth saying, and worded to the
 * CLAUDE.md tone rule: honest, warm, never scolding. It names what would pay off
 * rather than what is wrong, and a mix that is already right gets told so.
 *
 * The first case is the one this whole feature exists for — the workbook's
 * finding that a high shooter practicing mostly full swing has it backwards.
 */
function buildHeadline(
  band: PracticeBand,
  buckets: RatioBucketResult[],
  mixMinutes: number,
  hasEnoughData: boolean,
): string {
  const by = (key: RatioBucketKey) =>
    buckets.find((b) => b.key === key) as RatioBucketResult;
  const scoring = by("scoring");
  const fullSwing = by("full_swing");
  const onCourse = by("on_course");
  const target = (b: RatioBucketResult) =>
    formatShareRange(b.target.min, b.target.max);

  if (!hasEnoughData) {
    return `That's ${formatMinutes(mixMinutes)} of practice in this window — enough to show, not yet enough to read. Log a few more sessions and this becomes a real picture of your mix.`;
  }

  // The backwards mix: the scoring game is short while the range is long.
  if (scoring.verdict === "below" && fullSwing.verdict === "above") {
    return `Full swing is taking ${formatShare(fullSwing.share)} of your practice while the scoring game gets ${formatShare(scoring.share)}. For ${band.label}, most of the strokes are being lost inside 100 yards — ${target(scoring)} on the scoring game is the fastest way to move the number.`;
  }

  if (scoring.verdict === "below") {
    return `The scoring game is getting ${formatShare(scoring.share)} of your practice. For ${band.label}, ${target(scoring)} is the mix that saves the most strokes — chipping, wedges, and putting are where they go.`;
  }

  if (scoring.verdict === "above") {
    return `You're leaning hard into the scoring game at ${formatShare(scoring.share)}, past the ${target(scoring)} benchmark for ${band.label}. That's the right thing to lean into — a little more full-swing and on-course time is what makes it show up in a score.`;
  }

  if (onCourse.verdict === "below") {
    return `Your practice mix looks right for ${band.label}. The one thing worth adding: playing holes is at ${formatShare(onCourse.share)}, and ${target(onCourse)} is where practice starts turning into a score.`;
  }

  if (fullSwing.verdict === "below") {
    return `Your short game is well fed at ${formatShare(scoring.share)} — good. Full swing is at ${formatShare(fullSwing.share)}, and ${target(fullSwing)} keeps the long game moving along with it.`;
  }

  if (fullSwing.verdict === "above") {
    return `Your scoring game is right where it should be at ${formatShare(scoring.share)}. Full swing is at ${formatShare(fullSwing.share)}, past the ${target(fullSwing)} benchmark for ${band.label} — that extra hour probably pays better around the green or out on the course.`;
  }

  if (onCourse.verdict === "above") {
    return `You're getting out to play a lot — ${formatShare(onCourse.share)} of your practice, past the ${target(onCourse)} benchmark. That's a good problem to have; just keep the short-game reps that fix things happening too.`;
  }

  // Everything above has narrowed each bucket to `in_range`, so this is the
  // genuinely-balanced case, not a fallthrough.
  return `Your mix is right where it should be for ${band.label} — scoring game ${formatShare(scoring.share)}, full swing ${formatShare(fullSwing.share)}, on course ${formatShare(onCourse.share)}. Keep it there.`;
}
