import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { DataValue } from "@/components/ui/data-value";
import { RoundList } from "@/components/rounds/round-list";
import { getActiveAthleteId } from "@/lib/auth/athlete";
import { getRounds } from "@/lib/rounds/queries";
import { scoringAverage } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";

/**
 * The Score Log — the round list. Newest first (ordered in the query), filterable
 * by type and delete-able in `RoundList`. The one derived number shown here, the
 * scoring average, comes from the stats engine; the form's job is to write rows
 * and the numbers are derived downstream (Session 8 carry-forward).
 */
export default async function RoundsPage() {
  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);
  // Parent/coach accounts (no athlete row) have no Score Log of their own; the
  // dashboard is where they land. Athlete resolution is server-side, always.
  if (!athleteId) redirect("/dashboard");

  const rounds = await getRounds(supabase, athleteId);
  const average = scoringAverage(rounds);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Rounds</h1>
          <p className="text-sm text-muted-foreground">
            Your Score Log. Every round you play, logged.
          </p>
        </div>
        <Link
          href="/rounds/new"
          className={buttonVariants({ variant: "primary" })}
        >
          <Plus aria-hidden />
          Log a round
        </Link>
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-3 rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Scoring average
          </span>
          {average === null ? (
            <span className="text-sm text-muted-foreground">
              Log 18-hole tournament rounds to see it
            </span>
          ) : (
            <DataValue className="text-2xl text-foreground">
              {average}
            </DataValue>
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Rounds logged
          </span>
          <DataValue className="text-2xl text-foreground">
            {rounds.length}
          </DataValue>
        </div>
      </div>

      <RoundList rounds={rounds} />
    </section>
  );
}
