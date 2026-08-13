import { CalendarClock, Check, CircleDashed, MapPin } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { formatPlayedOn } from "@/lib/rounds/format";
import { daysUntil, nextEvent } from "@/lib/dashboard/present";
import type { EventRow } from "@/lib/stats";

export interface NextEventCardProps {
  events: EventRow[];
  /** Today, `YYYY-MM-DD`. */
  today: string;
}

/**
 * The next event on the calendar with a countdown. `skipped` events are out of
 * the plan, so they never surface here; with nothing scheduled ahead the card
 * prompts the athlete to plan one rather than showing a broken countdown.
 */
export function NextEventCard({ events, today }: NextEventCardProps) {
  const event = nextEvent(events, today);

  return (
    <section
      aria-labelledby="next-event-heading"
      className="metric-card flex flex-col gap-3"
    >
      <div className="flex items-center gap-2">
        <CalendarClock aria-hidden className="size-4 text-muted-foreground" />
        <h2 id="next-event-heading" className="text-lg font-semibold">
          Next event
        </h2>
      </div>

      {event ? (
        <NextEvent event={event} today={today} />
      ) : (
        <EmptyState
          title="Nothing scheduled ahead"
          hint="Add your next tournament to your schedule to see the date and a countdown here."
        />
      )}
    </section>
  );
}

function NextEvent({ event, today }: { event: EventRow; today: string }) {
  const days = daysUntil(today, event.plays_on);
  const countdown =
    days <= 0 ? "Today" : days === 1 ? "Tomorrow" : `in ${days} days`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold text-foreground">{event.name}</span>
        <span className="text-sm font-medium text-foreground">{countdown}</span>
      </div>
      <p className="text-sm text-muted-foreground">
        {formatPlayedOn(event.plays_on)}
        {event.course ? ` · ${event.course}` : ""}
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {event.city ? (
          <span className="inline-flex items-center gap-1">
            <MapPin aria-hidden className="size-3.5" />
            {event.city}
          </span>
        ) : null}
        <RegistrationBadge status={event.status} />
      </div>
    </div>
  );
}

function RegistrationBadge({ status }: { status: EventRow["status"] }) {
  if (status === "registered") {
    return (
      <span className="status-success inline-flex items-center gap-1 font-medium">
        <Check aria-hidden className="size-3.5" />
        Registered
      </span>
    );
  }
  if (status === "played") {
    return (
      <span className="inline-flex items-center gap-1 font-medium">
        <Check aria-hidden className="size-3.5" />
        Played
      </span>
    );
  }
  // not_registered — a neutral nudge, not an alarm.
  return (
    <span className="inline-flex items-center gap-1">
      <CircleDashed aria-hidden className="size-3.5" />
      Not registered yet
    </span>
  );
}
