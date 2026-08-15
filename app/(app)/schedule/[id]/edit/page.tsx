import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { EventForm } from "@/components/schedule/event-form";
import { getActiveAthleteId } from "@/lib/auth/athlete";
import { feeCentsToDollarsInput } from "@/lib/schedule/format";
import { getEvent, getTours, type EventWithTour } from "@/lib/schedule/queries";
import type { EventFormValues, Holes } from "@/lib/schemas/event";
import { createClient } from "@/lib/supabase/server";

/**
 * Edit an existing event. Same form as new, prefilled — the fee stored as integer
 * cents loads back as the whole-dollars string the input holds (see
 * `feeCentsToDollarsInput`), and the schema re-converts it on save.
 */
export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);
  if (!athleteId) redirect("/dashboard");

  const [event, tours] = await Promise.all([
    getEvent(supabase, athleteId, id),
    getTours(supabase),
  ]);
  if (!event) notFound();

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href={`/schedule/${event.id}`}
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft aria-hidden className="size-4" />
          Back to event
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Edit event</h1>
        <p className="text-sm text-muted-foreground">
          {event.name} · update anything that changed.
        </p>
      </div>

      <EventForm
        mode="edit"
        eventId={event.id}
        tours={tours}
        initialValues={toFormValues(event)}
      />
    </section>
  );
}

/** Map a stored event onto the form's value shape. The fee (integer cents) becomes
 * the dollars string the input holds; a null fee becomes "" (unset). */
function toFormValues(event: EventWithTour): EventFormValues {
  return {
    name: event.name,
    plays_on: event.plays_on,
    tour_id: event.tour_id,
    course: event.course,
    city: event.city,
    // The DB check constraint guarantees holes is 9 or 18.
    holes: event.holes as Holes,
    entry_fee: feeCentsToDollarsInput(event.entry_fee_cents),
    priority: event.priority,
    status: event.status,
    notes: event.notes,
  };
}
