"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ChevronRight, MapPin } from "lucide-react";

import { DataValue } from "@/components/ui/data-value";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildScheduleList } from "@/lib/schedule/present";
import { formatDayShort, formatFeeCents } from "@/lib/schedule/format";
import type { EventWithTour } from "@/lib/schedule/queries";

import { deleteEventAction } from "@/app/(app)/schedule/actions";
import { PriorityBadge, StatusBadge } from "./event-badges";
import { DeleteEventButton } from "./delete-event-button";

/**
 * The season schedule, grouped by month with the inter-event gap markers threaded
 * in (the workbook's 60-day rule made visible in place). Delete is optimistic — a
 * removed event vanishes at once and the month groups and gaps recompute on the
 * spot, reconciling when the server revalidates.
 *
 * The arrangement (month headings, which gaps are warnings, which event is "next
 * up") is the pure `buildScheduleList` from `lib/schedule/present`, so this
 * component only renders — it derives nothing itself.
 */
export function EventList({
  events,
  today,
}: {
  events: EventWithTour[];
  today: string;
}) {
  const [, startTransition] = React.useTransition();

  const [optimisticEvents, removeOptimistic] = React.useOptimistic(
    events,
    (state, idToRemove: string) => state.filter((e) => e.id !== idToRemove),
  );

  const handleDelete = (id: string) => {
    startTransition(async () => {
      removeOptimistic(id);
      const fd = new FormData();
      fd.set("id", id);
      await deleteEventAction(fd);
    });
  };

  if (optimisticEvents.length === 0) {
    return (
      <EmptyState
        title="No events on your schedule yet"
        hint="Add your tournaments and practice rounds to see your season at a glance — with gap-day warnings and your total entry fees."
        action={
          <Link
            href="/schedule/new"
            className={buttonVariants({ variant: "primary" })}
          >
            Add your first event
          </Link>
        }
      />
    );
  }

  const items = buildScheduleList(optimisticEvents, today);

  return (
    <ol className="flex flex-col gap-2">
      {items.map((item, i) => {
        if (item.kind === "month") {
          return (
            <li key={`m-${item.key}`} className={cn("px-1", i > 0 && "pt-4")}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {item.label}
              </h2>
            </li>
          );
        }
        if (item.kind === "gap") {
          return (
            <GapMarker
              key={`g-${i}`}
              days={item.days}
              warn={item.exceedsLimit}
            />
          );
        }
        return (
          <EventRow
            key={item.event.id}
            event={item.event}
            isNext={item.isNext}
            onDelete={handleDelete}
          />
        );
      })}
    </ol>
  );
}

/** The day-count bridge between two consecutive planned events. Past 60 days it
 * becomes a warning (reusing the reserved `--warning` treatment with an icon and
 * a label, never colour alone). */
function GapMarker({ days, warn }: { days: number; warn: boolean }) {
  if (warn) {
    return (
      <li className="flex items-center justify-center px-1 py-1">
        <span className="gap-warning text-xs">
          <AlertTriangle aria-hidden className="size-3.5 shrink-0" />
          {days}-day gap — over the 60-day plan
        </span>
      </li>
    );
  }
  return (
    <li
      className="flex items-center gap-2 px-3 text-xs text-muted-foreground"
      aria-hidden
    >
      <span className="h-px flex-1 bg-border" />
      {days} days
      <span className="h-px flex-1 bg-border" />
    </li>
  );
}

function EventRow({
  event,
  isNext,
  onDelete,
}: {
  event: EventWithTour;
  isNext: boolean;
  onDelete: (id: string) => void;
}) {
  const label = `${event.name} on ${formatDayShort(event.plays_on)}`;
  const place = [event.course, event.city].filter(Boolean).join(" · ");

  return (
    <li className="flex items-stretch gap-1 rounded-lg border border-border bg-card">
      <Link
        href={`/schedule/${event.id}`}
        className="flex flex-1 items-center gap-3 rounded-l-lg px-3 py-3 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <div className="flex w-11 shrink-0 flex-col items-center">
          <DataValue className="text-base leading-none text-foreground">
            {formatDayShort(event.plays_on).split(" ")[1]}
          </DataValue>
          <span className="text-[0.65rem] uppercase text-muted-foreground">
            {formatDayShort(event.plays_on).split(" ")[0]}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium text-foreground">{event.name}</span>
            {isNext ? (
              <span className="inline-flex items-center rounded-full border border-secondary-strong/40 bg-secondary/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-foreground">
                Next up
              </span>
            ) : null}
          </div>
          {(event.tour?.name || place) && (
            <span className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
              {event.tour?.name ? <span>{event.tour.name}</span> : null}
              {place ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin aria-hidden className="size-3.5" />
                  {place}
                </span>
              ) : null}
            </span>
          )}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <StatusBadge status={event.status} />
            <PriorityBadge priority={event.priority} />
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <DataValue className="text-sm text-foreground">
            {formatFeeCents(event.entry_fee_cents)}
          </DataValue>
          <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
        </div>
      </Link>
      <div className="flex items-center pr-1">
        <DeleteEventButton
          eventId={event.id}
          eventLabel={label}
          onConfirm={() => onDelete(event.id)}
          size="sm"
        />
      </div>
    </li>
  );
}
