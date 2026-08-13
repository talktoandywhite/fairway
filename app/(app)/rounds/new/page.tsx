import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { RoundForm } from "@/components/rounds/round-form";
import { getActiveAthleteId } from "@/lib/auth/athlete";
import { getDistinctCourses } from "@/lib/rounds/queries";
import { createClient } from "@/lib/supabase/server";

/**
 * Log a new round. The form is the app's most important screen — required core
 * only, with the leak detail behind a disclosure — held to the 60-second
 * parking-lot standard. Course autocomplete is sourced from this athlete's own
 * history.
 */
export default async function NewRoundPage() {
  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);
  if (!athleteId) redirect("/dashboard");

  const courses = await getDistinctCourses(supabase, athleteId);

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

      <RoundForm mode="create" courses={courses} />
    </section>
  );
}
