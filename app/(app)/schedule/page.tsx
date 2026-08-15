import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarPlus, Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { GapWarning } from "@/components/dashboard/gap-warning";
import { EventList } from "@/components/schedule/event-list";
import { SeasonSummary } from "@/components/schedule/season-summary";
import { getActiveAthleteId } from "@/lib/auth/athlete";
import { todayISO } from "@/lib/dashboard/present";
import { getEvents } from "@/lib/schedule/queries";
import { statusCounts } from "@/lib/schedule/present";
import { longestGap, seasonFeeTotal } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";

/**
 * The Tournament Plan — the athlete's season schedule. Events grouped by month
 * with the gap markers threaded between them, a season summary, and the 60-day
 * gap warning. Every derived number comes from the stats engine (`seasonFeeTotal`,
 * `longestGap`) or the plain `statusCounts`; this page reads rows and lays out the
 * answers, never recomputing a metric itself (CLAUDE.md, "Calculations").
 *
 * A brand-new athlete with zero events never sees a zeroed summary or a blank
 * list — they get a real empty state that says what to do (Definition of Done,
 * "Never show an empty chart").
 */
export default async function SchedulePage() {
  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);
  // Parent/coach accounts (no athlete row) have no schedule of their own; the
  // dashboard is where they land. Athlete resolution is server-side, always.
  if (!athleteId) redirect("/dashboard");

  const events = await getEvents(supabase, athleteId);
  const today = todayISO();

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
          <p className="text-sm text-muted-foreground">
            Your Tournament Plan — the season, month by month.
          </p>
        </div>
        <Link
          href="/schedule/new"
          className={buttonVariants({ variant: "primary" })}
        >
          <Plus aria-hidden />
          Add event
        </Link>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={<CalendarPlus className="size-6" aria-hidden />}
          title="No events on your schedule yet"
          hint="Add your tournaments and practice rounds to map out your season. You'll see gap-day warnings, your total entry fees, and a countdown to what's next."
          action={
            <Link
              href="/schedule/new"
              className={buttonVariants({ variant: "primary" })}
            >
              Add your first event
            </Link>
          }
        />
      ) : (
        <>
          <SeasonSummary
            counts={statusCounts(events)}
            feeTotalCents={seasonFeeTotal(events)}
            longestGapDays={longestGap(events)}
          />
          <GapWarning longestGapDays={longestGap(events)} />
          <EventList events={events} today={today} />
        </>
      )}
    </section>
  );
}
