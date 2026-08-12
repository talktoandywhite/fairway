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

export { gapDays, longestGap, seasonFeeTotal } from "./events";

export { minutesByType, practiceRatio } from "./practice";

export { SESSION_TYPES } from "./types";
export type {
  RoundRow,
  EventRow,
  PracticeSessionRow,
  SessionType,
  SessionTypeTotals,
  RoundAverageField,
  Trendline,
} from "./types";
