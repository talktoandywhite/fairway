/**
 * The stats engine — every workbook formula, ported to a pure, tested function.
 *
 * These are the reference implementations of Fairway's derived metrics (CLAUDE.md,
 * "Calculations"). They have no database access: callers fetch rows and pass them
 * in. When a metric later needs to be fast at scale it may graduate to a
 * materialized view, but the function here stays the spec and the test oracle.
 */
export {
  scoringAverage,
  lastNAverage,
  bestRound,
  strokesToGoal,
  averagePerRound,
  trendline,
} from "./rounds";

/**
 * The qualifying-round predicate is exported so a caller that must render the
 * SAME population the headline metrics use — the dashboard's trend chart — draws
 * from the engine's own definition rather than re-implementing "18-hole
 * tournament", which would be a correctness hazard the moment the rule changes.
 */
export { isQualifyingRound, qualifyingRounds } from "./helpers";

export { gapDays, longestGap, seasonFeeTotal } from "./events";

export { minutesByType, practiceRatio } from "./practice";

export { lessonSpendCents, outstandingHomework } from "./lessons";

export { SESSION_TYPES } from "./types";
export type {
  RoundRow,
  EventRow,
  LessonRow,
  PracticeSegmentRow,
  PracticeSessionRow,
  SessionType,
  SessionTypeTotals,
  RoundAverageField,
  Trendline,
} from "./types";
