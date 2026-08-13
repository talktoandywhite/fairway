import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { RoundForm } from "@/components/rounds/round-form";
import { getActiveAthleteId } from "@/lib/auth/athlete";
import { getDistinctCourses, getRound } from "@/lib/rounds/queries";
import type { Holes, RoundFormValues } from "@/lib/schemas/round";
import { createClient } from "@/lib/supabase/server";
import type { RoundRow } from "@/lib/stats";

/**
 * Edit an existing round. Same form as new, prefilled — the null-vs-zero contract
 * carries through: a detail column stored as `null` loads as an empty stepper
 * ("not recorded"), a stored `0` loads as a real 0, and the form re-persists each
 * faithfully.
 */
export default async function EditRoundPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);
  if (!athleteId) redirect("/dashboard");

  const [round, courses] = await Promise.all([
    getRound(supabase, athleteId, id),
    getDistinctCourses(supabase, athleteId),
  ]);
  if (!round) notFound();

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href={`/rounds/${round.id}`}
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft aria-hidden className="size-4" />
          Back to round
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Edit round</h1>
        <p className="text-sm text-muted-foreground">
          {round.course} · update anything that changed.
        </p>
      </div>

      <RoundForm
        mode="edit"
        roundId={round.id}
        courses={courses}
        initialValues={toFormValues(round)}
      />
    </section>
  );
}

/** Map a stored round onto the form's value shape, preserving null-vs-zero exactly. */
function toFormValues(round: RoundRow): RoundFormValues {
  return {
    played_on: round.played_on,
    course: round.course,
    round_type: round.round_type,
    // The DB check constraint guarantees holes is 9 or 18.
    holes: round.holes as Holes,
    par: round.par,
    score: round.score,
    penalty_strokes: round.penalty_strokes,
    three_putts: round.three_putts,
    total_putts: round.total_putts,
    fairways_hit: round.fairways_hit,
    fairways_possible: round.fairways_possible,
    greens_in_regulation: round.greens_in_regulation,
    up_and_downs: round.up_and_downs,
    doubles_or_worse: round.doubles_or_worse,
    notes: round.notes,
  };
}
