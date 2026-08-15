import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { EventForm } from "@/components/schedule/event-form";
import { getActiveAthleteId } from "@/lib/auth/athlete";
import { getTours } from "@/lib/schedule/queries";
import { createClient } from "@/lib/supabase/server";

/**
 * Add an event to the schedule. The tour picker is sourced from the shared
 * catalog; pre-filling an event FROM a tour (fee, format, dates) is Session 21 —
 * here the form just lets you attach one for display and grouping.
 */
export default async function NewEventPage() {
  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);
  if (!athleteId) redirect("/dashboard");

  const tours = await getTours(supabase);

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
        <h1 className="text-2xl font-semibold tracking-tight">Add an event</h1>
        <p className="text-sm text-muted-foreground">
          Name and date are all you need. Add the tour, course, fee, and
          priority if you have them.
        </p>
      </div>

      <EventForm mode="create" tours={tours} />
    </section>
  );
}
