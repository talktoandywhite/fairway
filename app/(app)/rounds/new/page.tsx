import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { RoundForm } from "@/components/rounds/round-form";
import { getActiveAthleteId } from "@/lib/auth/athlete";
import { getDistinctCourses } from "@/lib/rounds/queries";
import { getEvent } from "@/lib/schedule/queries";
import type { RoundFormValues } from "@/lib/schemas/round";
import { createClient } from "@/lib/supabase/server";

/**
 * Log a new round. The form is the app's most important screen — required core
 * only, with the leak detail behind a disclosure — held to the 60-second
 * parking-lot standard. Course autocomplete is sourced from this athlete's own
 * history.
 *
 * When reached from the schedule with `?eventId=…` (the "mark played → log the
 * round" handoff), the event's date and course prefill the form and the round is
 * linked to that event on save. The event is fetched server-side and RLS-scoped,
 * so a foreign or bogus id simply yields no prefill and no link.
 */
export default async function NewRoundPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);
  if (!athleteId) redirect("/dashboard");

  const { eventId } = await searchParams;
  const [courses, linkedEvent] = await Promise.all([
    getDistinctCourses(supabase, athleteId),
    eventId ? getEvent(supabase, athleteId, eventId) : Promise.resolve(null),
  ]);

  // Prefill the date and course from the event. The date is capped at today —
  // the round schema forbids a future played_on, and an event marked played is by
  // definition not in the future.
  const today = new Date().toISOString().slice(0, 10);
  const prefill: Partial<RoundFormValues> | undefined = linkedEvent
    ? {
        played_on: linkedEvent.plays_on > today ? today : linkedEvent.plays_on,
        course: linkedEvent.course ?? "",
      }
    : undefined;

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/rounds"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft aria-hidden className="size-4" />
          Back to rounds
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Log a round</h1>
        <p className="text-sm text-muted-foreground">
          Date, course, type, holes, par, and score are all you need. Add the
          detail if you tracked it.
        </p>
      </div>

      <RoundForm
        mode="create"
        courses={courses}
        eventId={linkedEvent?.id}
        eventName={linkedEvent?.name}
        prefill={prefill}
      />
    </section>
  );
}
