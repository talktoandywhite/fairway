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
import type { PracticeSessionRow } from "@/lib/stats";

import { deletePracticeAction } from "@/app/(app)/practice/actions";
import { DeletePracticeButton } from "./delete-practice-button";

/**
 * The Practice Log list: newest first (ordered server-side), already narrowed to
 * the selected window by the page, and grouped by month so a long log stays
 * scannable. Delete is optimistic — a removed session vanishes at once and
 * reconciles when the server revalidates.
 *
 * The month helpers are reused as-is from `lib/schedule/format`; they are pure
 * `YYYY-MM-DD` string helpers with nothing schedule-specific about them, and a
 * second copy would be a second thing to keep correct.
 *
 * Rows show raw fields only — date, type, minutes, and whatever the athlete
 * wrote. Every derived number on this screen (the rollup, the mix) lives above
 * this component and comes from the engine.
 */
export function PracticeList({
  sessions,
  windowLabel,
}: {
  sessions: PracticeSessionRow[];
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
  session: PracticeSessionRow;
  onDelete: (id: string) => void;
}) {
  const typeLabel = SESSION_TYPE_LABELS[session.session_type];
  const label = `${formatMinutes(session.minutes)} of ${typeLabel.toLowerCase()} on ${formatDayShort(session.occurred_on)}`;
  const [day, dayNumber] = formatDayShort(session.occurred_on).split(" ");
  // The one-line summary under the title: whichever of these the athlete wrote.
  const summary = [session.focus, session.drill].filter(Boolean).join(" · ");

  return (
    <li className="flex items-stretch gap-1 rounded-lg border border-border bg-card">
      <Link
        href={`/practice/${session.id}`}
        // `min-w-0` matters: without it this flex child refuses to shrink below
        // its content's intrinsic width, the `truncate` below never engages, and
        // a long focus or drill line pushes the delete button off the screen at
        // 375px. A truncation that only works on short strings isn't one.
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
          <span className="font-medium text-foreground">{typeLabel}</span>
          {summary ? (
            <span className="truncate text-sm text-muted-foreground">
              {summary}
            </span>
          ) : null}
          {session.result ? (
            <span className="truncate text-sm text-muted-foreground">
              {session.result}
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <DataValue className="text-sm text-foreground">
            {formatMinutes(session.minutes)}
          </DataValue>
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
