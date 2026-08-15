"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { DataValue } from "@/components/ui/data-value";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { formatMinutes } from "@/lib/practice/format";
import { formatDayShort, monthKey, monthLabel } from "@/lib/schedule/format";
import { SESSION_TYPE_LABELS } from "@/lib/schemas/practice";
import type { PracticeSessionWithSegments } from "@/lib/practice/queries";

import { deletePracticeAction } from "@/app/(app)/practice/actions";
import { DeletePracticeButton } from "./delete-practice-button";

/**
 * The Practice Log list: newest first (ordered server-side), already narrowed to
 * the selected window by the page, and grouped by month so a long log stays
 * scannable. Delete is optimistic — a removed session vanishes at once and
 * reconciles when the server revalidates.
 *
 * Each row is a day's block, so it names the disciplines it covered and shows the
 * block's total minutes. A four-part afternoon reads as one row, which is the
 * point of the whole shape.
 *
 * The month helpers are reused as-is from `lib/schedule/format`; they are pure
 * `YYYY-MM-DD` string helpers with nothing schedule-specific about them, and a
 * second copy would be a second thing to keep correct.
 */
export function PracticeList({
  sessions,
  windowLabel,
}: {
  sessions: PracticeSessionWithSegments[];
  /** e.g. "30 days" — used by the empty state, which must not imply the athlete
   * has logged nothing ever when they have simply logged nothing lately. */
  windowLabel: string;
}) {
  const [, startTransition] = React.useTransition();

  const [optimisticSessions, removeOptimistic] = React.useOptimistic(
    sessions,
    (state, idToRemove: string) => state.filter((s) => s.id !== idToRemove),
  );

  const handleDelete = (id: string) => {
    startTransition(async () => {
      removeOptimistic(id);
      const fd = new FormData();
      fd.set("id", id);
      await deletePracticeAction(fd);
    });
  };

  if (optimisticSessions.length === 0) {
    return (
      <EmptyState
        title={`Nothing logged in the last ${windowLabel.toLowerCase()}`}
        hint="Log a session — or widen the window above to see further back."
      />
    );
  }

  let currentMonth: string | null = null;

  return (
    <ol className="flex flex-col gap-2">
      {optimisticSessions.map((session, i) => {
        const mk = monthKey(session.occurred_on);
        const startsMonth = mk !== currentMonth;
        if (startsMonth) currentMonth = mk;

        return (
          <React.Fragment key={session.id}>
            {startsMonth ? (
              <li className={cn("px-1", i > 0 && "pt-4")}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {monthLabel(mk)}
                </h3>
              </li>
            ) : null}
            <SessionRow session={session} onDelete={handleDelete} />
          </React.Fragment>
        );
      })}
    </ol>
  );
}

function SessionRow({
  session,
  onDelete,
}: {
  session: PracticeSessionWithSegments;
  onDelete: (id: string) => void;
}) {
  const minutes = session.segments.reduce((sum, s) => sum + s.minutes, 0);
  const titles = session.segments.map(
    (s) => SESSION_TYPE_LABELS[s.session_type],
  );
  const title = titles.join(" · ");
  const label = `${formatMinutes(minutes)} on ${formatDayShort(session.occurred_on)}`;
  const [day, dayNumber] = formatDayShort(session.occurred_on).split(" ");

  // The one-line summary under the disciplines: whichever detail the athlete
  // wrote, taken from whichever segments they wrote it against.
  const summary = session.segments
    .map((s) => s.focus ?? s.drill)
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex items-stretch gap-1 rounded-lg border border-border bg-card">
      <Link
        href={`/practice/${session.id}`}
        // `min-w-0` matters: without it this flex child refuses to shrink below
        // its content's intrinsic width, the `truncate` below never engages, and
        // a long summary pushes the delete button off the screen at 375px.
        className="flex min-w-0 flex-1 items-center gap-3 rounded-l-lg px-3 py-3 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <div className="flex w-11 shrink-0 flex-col items-center">
          <DataValue className="text-base leading-none text-foreground">
            {dayNumber}
          </DataValue>
          <span className="text-[0.65rem] uppercase text-muted-foreground">
            {day}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-medium text-foreground">{title}</span>
          {summary ? (
            <span className="truncate text-sm text-muted-foreground">
              {summary}
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex flex-col items-end">
            <DataValue className="text-sm text-foreground">
              {formatMinutes(minutes)}
            </DataValue>
            {session.segments.length > 1 ? (
              <span className="text-[0.65rem] uppercase text-muted-foreground">
                {session.segments.length} parts
              </span>
            ) : null}
          </div>
          <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
        </div>
      </Link>
      <div className="flex items-center pr-1">
        <DeletePracticeButton
          sessionId={session.id}
          sessionLabel={label}
          onConfirm={() => onDelete(session.id)}
          size="sm"
        />
      </div>
    </li>
  );
}
