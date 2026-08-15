import type { LessonRow } from "./types";

/**
 * Metrics over the Lesson Log.
 *
 * Two questions the log can answer that a list of rows cannot: what lessons have
 * cost, and whether there is homework still owed. Both are pure functions over
 * rows the caller fetched, like everything else in the engine.
 */

/**
 * Lessons newest-first, tie-broken by insertion order so two lessons on the same
 * day still have a stable, deterministic sequence. A sort that ties arbitrarily
 * would make "the most recent lesson" flicker between renders, and the whole
 * homework rule below hangs off which lesson that is.
 */
function newestFirst(lessons: LessonRow[]): LessonRow[] {
  return [...lessons].sort(
    (a, b) =>
      b.occurred_on.localeCompare(a.occurred_on) ||
      b.created_at.localeCompare(a.created_at),
  );
}

/**
 * Total spent on lessons, in integer cents, across the lessons passed in. A null
 * cost is treated as 0 — unrecorded, not free — and never as a reason to drop the
 * lesson from the count. Returns 0 for no lessons: a sum over nothing is
 * genuinely zero, unlike an average.
 *
 * The caller chooses the window (a season, everything). This mirrors
 * `seasonFeeTotal` over events; the two are the athlete's whole cost picture and
 * they are computed the same way on purpose.
 */
export function lessonSpendCents(lessons: LessonRow[]): number {
  return lessons.reduce((total, lesson) => total + (lesson.cost_cents ?? 0), 0);
}

/**
 * The lesson whose homework is still outstanding, or `null` when nothing is owed.
 *
 * **Only the most recent lesson can carry outstanding homework.** A lesson is a
 * conversation with a coach, and the next conversation supersedes the last one:
 * whatever the athlete did or didn't get to, the coach saw them again and set the
 * plan from there. Surfacing a drill from three lessons ago would be surfacing an
 * instruction that has already been overtaken — and it would turn the dashboard
 * into a pile of old obligations, which is exactly the nagging CLAUDE.md rules
 * out. The full history stays on the Lesson Log, where each lesson shows its own
 * homework and how it went.
 *
 * Outstanding means: the most recent lesson set a homework target, and it is not
 * marked `yes`. `null` (never answered) counts as outstanding — the athlete
 * hasn't said, and the honest response to an unanswered question is to ask it,
 * not to assume the answer.
 */
export function outstandingHomework(lessons: LessonRow[]): LessonRow | null {
  const latest = newestFirst(lessons)[0];
  if (!latest) return null;

  const target = latest.homework_target?.trim();
  if (!target) return null;

  return latest.homework_done === "yes" ? null : latest;
}
