import type { LessonRow } from "@/lib/stats";
import {
  HOMEWORK_STATUS_LABELS,
  HOMEWORK_UNANSWERED_LABEL,
  type HomeworkStatus,
} from "@/lib/schemas/lesson";
import { formatPlayedOn } from "@/lib/rounds/format";

import { lessonListTitle, lessonTitle } from "./format";

/**
 * Pure presentation logic for the Lesson Log — kept out of components so it is
 * unit-testable without a database or React (the Session 9/10/11 pattern). It
 * recomputes nothing the engine owns: WHICH lesson has outstanding homework is
 * decided by `outstandingHomework` in `lib/stats/lessons`, and everything here is
 * how that answer is worded.
 *
 * The wording is deterministic and grounded — every fact in a sentence below is a
 * field on the lesson row it was built from. Nothing here is generated, and the
 * AI layer never touches it (AI_COACH.md: the deterministic engine decides
 * substance; a fallback is built first and this is it).
 */

/** The label for a homework status, including the "not answered yet" case that
 * the nullable column allows and that the dashboard leans on. */
export function homeworkStatusLabel(status: HomeworkStatus | null): string {
  return status === null
    ? HOMEWORK_UNANSWERED_LABEL
    : HOMEWORK_STATUS_LABELS[status];
}

/** The dashboard card's content, all of it read off one lesson row. */
export interface HomeworkPrompt {
  lessonId: string;
  /** e.g. "Homework from Coach Diaz" — names who set it. */
  title: string;
  /** The plain sentence. Warm, honest, never scolding. */
  sentence: string;
  /** The drill the coach assigned, if one was recorded. */
  drill: string | null;
  /** What "done" looks like — the target the coach set. */
  target: string;
  /** The lesson's date, formatted. */
  occurredOn: string;
  status: HomeworkStatus | null;
}

/**
 * Word the outstanding homework for the dashboard.
 *
 * Three states, three tones, and none of them tells the athlete off (CLAUDE.md:
 * "Encouraging, never nagging. No streak-shaming, no red badges for a missed
 * session"). An unanswered status asks a question rather than assuming the
 * answer; "partly" credits the work already done; "not yet" states the fact and
 * points forward. The date is stated but never counted into "it's been N days" —
 * a running tally of lateness is the nagging this rule exists to prevent.
 *
 * Callers pass a lesson the engine has already identified as carrying outstanding
 * homework, so `homework_target` is non-empty by construction; the fallback below
 * exists only so this function is total.
 */
export function homeworkPrompt(lesson: LessonRow): HomeworkPrompt {
  const target = lesson.homework_target?.trim() ?? "";
  const coach = lesson.coach_name?.trim();
  const date = formatPlayedOn(lesson.occurred_on);

  const sentence =
    lesson.homework_done === "partly"
      ? `You're partway through the homework from your ${date} lesson. Finishing it off is the fastest thing on this page.`
      : lesson.homework_done === "no"
        ? `The homework from your ${date} lesson is still waiting. It's the one thing your coach asked for — worth getting to before the next one.`
        : `Your ${date} lesson set homework, and you haven't said how it's going. Log it and it stops being a question.`;

  return {
    lessonId: lesson.id,
    title: coach ? `Homework from ${coach}` : "Homework from your last lesson",
    sentence,
    drill: lesson.drill_assigned?.trim() || null,
    target,
    occurredOn: date,
    status: lesson.homework_done,
  };
}

/** A lesson's one-line summary for the log list: the swing key if there is one,
 * otherwise what changed, otherwise the drill. Whichever the athlete actually
 * wrote — an empty row reads as no subtitle rather than a blank line. */
export function lessonSummary(lesson: LessonRow): string | null {
  return (
    lesson.swing_key?.trim() ||
    lesson.what_changed?.trim() ||
    lesson.drill_assigned?.trim() ||
    null
  );
}

/** Re-exported so the list and detail views title a lesson the same way the
 * delete confirmation does. */
export { lessonListTitle, lessonTitle };
