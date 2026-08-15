import type { Database } from "@/types/database";

/**
 * Row types for the stats engine come straight from the generated database
 * types — never hand-write a row shape (see CLAUDE.md, TypeScript conventions).
 * Every function here is pure: callers fetch these rows and pass them in. No
 * function in `lib/stats` touches Supabase.
 */
export type RoundRow = Database["public"]["Tables"]["rounds"]["Row"];
export type EventRow = Database["public"]["Tables"]["events"]["Row"];
/**
 * The practice row the engine measures is the SEGMENT, not the session. A
 * session is a day's block and may cover several disciplines; the minutes that
 * belong to each one live on its segment (migration 0010). Everything in
 * `lib/stats/practice` therefore counts segments — a session total would have to
 * be divided to be useful, and a divided total is a number nobody entered.
 */
export type PracticeSegmentRow =
  Database["public"]["Tables"]["practice_segments"]["Row"];

/** The parent block: a date and its notes. Carried for callers that arrange
 * segments by day; no metric is computed from it. */
export type PracticeSessionRow =
  Database["public"]["Tables"]["practice_sessions"]["Row"];

export type SessionType = Database["public"]["Enums"]["session_type"];

/**
 * The nullable numeric detail columns on `rounds` that `averagePerRound` can
 * average. Each is `number | null` on the Row — null means "not recorded", and
 * the average skips it from both numerator and denominator (never treats it as
 * zero). See migration 0007's comment and CLAUDE.md ("null means not recorded").
 */
export type RoundAverageField =
  | "penalty_strokes"
  | "three_putts"
  | "total_putts"
  | "fairways_hit"
  | "fairways_possible"
  | "greens_in_regulation"
  | "up_and_downs"
  | "doubles_or_worse";

/**
 * A least-squares fit of score against time, for the dashboard trend line.
 *
 * `slope` is strokes per day — negative means the athlete is improving. The x
 * basis is days-since-the-first-qualifying-round (not round index), so the line
 * overlays correctly on a date axis where rounds are unevenly spaced. `intercept`
 * is the fitted score at that first round (x = 0).
 */
export interface Trendline {
  slope: number;
  intercept: number;
}

/**
 * Every `session_type`, in enum order. Used to return a fully-populated
 * minutes/ratio record so charts and the ratio check never have to guess at
 * missing keys. The `satisfies` clause plus `_SessionTypesAreExhaustive` below
 * fail compilation if the enum and this list ever drift apart.
 */
export const SESSION_TYPES = [
  "range_full_swing",
  "range_wedges",
  "short_game",
  "putting",
  "on_course",
  "exercise",
  "lesson",
] as const satisfies readonly SessionType[];

// Compile-time guard: every enum member must appear in SESSION_TYPES above.
type _MissingSessionType = Exclude<SessionType, (typeof SESSION_TYPES)[number]>;
type _SessionTypesAreExhaustive = _MissingSessionType extends never
  ? true
  : ["session_type missing from SESSION_TYPES:", _MissingSessionType];
const _sessionTypesAreExhaustive: _SessionTypesAreExhaustive = true;
void _sessionTypesAreExhaustive;

/** Minutes (or a ratio) keyed by every session type. */
export type SessionTypeTotals = Record<SessionType, number>;
