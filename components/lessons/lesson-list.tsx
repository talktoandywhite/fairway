"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { DataValue } from "@/components/ui/data-value";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  formatCostCents,
  lessonListTitle,
  lessonTitle,
} from "@/lib/lessons/format";
import { lessonSummary } from "@/lib/lessons/present";
import { formatDayShort } from "@/lib/schedule/format";
import { formatPlayedOn } from "@/lib/rounds/format";
import type { LessonRow } from "@/lib/stats";

import { deleteLessonAction } from "@/app/(app)/lessons/actions";
import { DeleteLessonButton } from "./delete-lesson-button";
import { HomeworkBadge } from "./homework-badge";

/**
 * The Lesson Log list: newest first (ordered server-side) and grouped by year,
 * because lessons are sparse — a month grouping would mean a heading above almost
 * every row. Delete is optimistic: a removed lesson vanishes at once and
 * reconciles when the server revalidates.
 *
 * Each row leads with the coach and the swing key, because that is what an
 * athlete scans for ("what did we work on with the putter?"), and carries the
 * homework badge — the one part of a lesson that outlives the hour.
 *
 * The compact day formatter is reused as-is from `lib/schedule/format`; it is a
 * pure `YYYY-MM-DD` string helper with nothing schedule-specific about it, and a
 * second copy would be a second thing to keep correct.
 */
export function LessonList({ lessons }: { lessons: LessonRow[] }) {
  const [, startTransition] = React.useTransition();

  const [optimisticLessons, removeOptimistic] = React.useOptimistic(
    lessons,
    (state, idToRemove: string) => state.filter((l) => l.id !== idToRemove),
  );

  const handleDelete = (id: string) => {
    startTransition(async () => {
      removeOptimistic(id);
      const fd = new FormData();
      fd.set("id", id);
      await deleteLessonAction(fd);
    });
  };

  if (optimisticLessons.length === 0) {
    return (
      <EmptyState
        title="No lessons left in the log"
        hint="Log your next one and the swing keys, drills, and homework start building into a record you can look back through."
      />
    );
  }

  let currentYear: string | null = null;

  return (
    <ol className="flex flex-col gap-2">
      {optimisticLessons.map((lesson, i) => {
        const year = lesson.occurred_on.slice(0, 4);
        const startsYear = year !== currentYear;
        if (startsYear) currentYear = year;

        return (
          <React.Fragment key={lesson.id}>
            {startsYear ? (
              <li className={cn("px-1", i > 0 && "pt-4")}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {year}
                </h3>
              </li>
            ) : null}
            <LessonRowItem lesson={lesson} onDelete={handleDelete} />
          </React.Fragment>
        );
      })}
    </ol>
  );
}

function LessonRowItem({
  lesson,
  onDelete,
}: {
  lesson: LessonRow;
  onDelete: (id: string) => void;
}) {
  // In the row, the coach's name alone — the page has already said these are
  // lessons, and the full "Lesson with …" spends the truncation budget on the
  // word every row shares. The delete confirmation still names it in full,
  // because there it stands on its own.
  const title = lessonListTitle(lesson.coach_name);
  const summary = lessonSummary(lesson);
  const label = `${lessonTitle(lesson.coach_name)} on ${formatPlayedOn(lesson.occurred_on)}`;
  const [month, day] = formatDayShort(lesson.occurred_on).split(" ");

  return (
    <li className="flex items-stretch gap-1 rounded-lg border border-border bg-card">
      <Link
        href={`/lessons/${lesson.id}`}
        // `min-w-0` matters: without it this flex child refuses to shrink below
        // its content's intrinsic width, the `truncate` below never engages, and
        // a long swing key pushes the delete button off the screen at 375px.
        className="flex min-w-0 flex-1 items-center gap-3 rounded-l-lg px-3 py-3 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <div className="flex w-11 shrink-0 flex-col items-center">
          <DataValue className="text-base leading-none text-foreground">
            {day}
          </DataValue>
          <span className="text-[0.65rem] uppercase text-muted-foreground">
            {month}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate font-medium text-foreground">{title}</span>
          {summary ? (
            <span className="truncate text-sm text-muted-foreground">
              {summary}
            </span>
          ) : null}
          {lesson.homework_target ? (
            <span className="flex">
              <HomeworkBadge status={lesson.homework_done} />
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {lesson.cost_cents !== null && lesson.cost_cents > 0 ? (
            <DataValue className="text-sm text-muted-foreground">
              {formatCostCents(lesson.cost_cents)}
            </DataValue>
          ) : null}
          <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
        </div>
      </Link>
      <div className="flex items-center pr-1">
        <DeleteLessonButton
          lessonId={lesson.id}
          lessonLabel={label}
          onConfirm={() => onDelete(lesson.id)}
          size="sm"
        />
      </div>
    </li>
  );
}
