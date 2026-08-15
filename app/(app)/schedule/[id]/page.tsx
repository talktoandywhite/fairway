import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, ChevronLeft, Flag, MapPin, Pencil } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { DataValue } from "@/components/ui/data-value";
import { PriorityBadge, StatusBadge } from "@/components/schedule/event-badges";
import { DeleteEventButton } from "@/components/schedule/delete-event-button";
import { EventStatusControls } from "@/components/schedule/event-status-actions";
import { getActiveAthleteId } from "@/lib/auth/athlete";
import { daysUntil, todayISO } from "@/lib/dashboard/present";
import { formatPlayedOn } from "@/lib/rounds/format";
import { formatFeeCents } from "@/lib/schedule/format";
import { getEvent, getLinkedRoundId } from "@/lib/schedule/queries";
import { createClient } from "@/lib/supabase/server";

/**
 * A single event. Shows the plan detail, the status/priority, and the status
 * controls that walk `not_registered → registered → played`. When an event is
 * marked played it does not silently create a round — this page OFFERS to log the
 * linked round (a round carries `event_id`), sending the athlete to the Session 8
 * round form pre-filled with this event's date and course. Once a round is linked,
 * the offer becomes a link to it.
 */
export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);
  if (!athleteId) redirect("/dashboard");

  const event = await getEvent(supabase, athleteId, id);
  if (!event) notFound();

  const linkedRoundId =
    event.status === "played"
      ? await getLinkedRoundId(supabase, athleteId, event.id)
      : null;

  const today = todayISO();
  const days = daysUntil(today, event.plays_on);
  const countdown =
    event.status === "played" || event.status === "skipped"
      ? null
      : days < 0
        ? null
        : days === 0
          ? "Today"
          : days === 1
            ? "Tomorrow"
            : `in ${days} days`;

  const place = [event.course, event.city].filter(Boolean).join(" · ");
  const label = `${event.name} on ${formatPlayedOn(event.plays_on)}`;
  const roundHref = `/rounds/new?eventId=${event.id}`;

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/schedule"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft aria-hidden className="size-4" />
          Back to schedule
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {event.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {formatPlayedOn(event.plays_on)}
              {countdown ? ` · ${countdown}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href={`/schedule/${event.id}/edit`}
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              <Pencil aria-hidden />
              Edit
            </Link>
            <DeleteEventButton eventId={event.id} eventLabel={label} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={event.status} />
          <PriorityBadge priority={event.priority} />
        </div>
      </div>

      {/* Plan detail */}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <DetailCell label="Tour" value={event.tour?.name ?? "—"} />
        <DetailCell label="Holes" value={event.holes} numeric />
        <DetailCell
          label="Entry fee"
          value={formatFeeCents(event.entry_fee_cents)}
          numeric
        />
      </dl>

      {place ? (
        <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin aria-hidden className="size-4" />
          {place}
        </p>
      ) : null}

      {/* The "log the round" handoff — only for a played event */}
      {event.status === "played" ? (
        linkedRoundId ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-success/30 bg-success/10 px-4 py-3">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-success">
              <CheckCircle2 aria-hidden className="size-4" />
              Round logged for this event
            </span>
            <Link
              href={`/rounds/${linkedRoundId}`}
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              View round
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3 rounded-lg border border-input bg-muted/40 px-4 py-4">
            <div className="flex items-start gap-2">
              <Flag
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-foreground">
                  You&apos;ve marked this played — log your score?
                </p>
                <p className="text-sm text-muted-foreground">
                  We&apos;ll start a new round with this event&apos;s date and
                  course filled in. It counts toward your scoring average if
                  it&apos;s an 18-hole tournament.
                </p>
              </div>
            </div>
            <Link
              href={roundHref}
              className={buttonVariants({ variant: "primary" }) + " self-start"}
            >
              Log this round
            </Link>
          </div>
        )
      ) : null}

      {/* Status controls */}
      <div className="flex flex-col gap-2 border-t border-border pt-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Status
        </h2>
        <EventStatusControls eventId={event.id} status={event.status} />
      </div>

      {event.notes ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Notes
          </h2>
          <p className="whitespace-pre-wrap rounded-lg border border-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground">
            {event.notes}
          </p>
        </div>
      ) : null}
    </section>
  );
}

/** One label + value in the plan-detail grid. */
function DetailCell({
  label,
  value,
  numeric = false,
}: {
  label: string;
  value: React.ReactNode;
  numeric?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card px-3 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd>
        {numeric ? (
          <DataValue className="text-lg text-foreground">{value}</DataValue>
        ) : (
          <span className="text-sm text-foreground">{value}</span>
        )}
      </dd>
    </div>
  );
}
