import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { DataValue } from "@/components/ui/data-value";
import { ScorecardTable } from "@/components/ui/scorecard-table";
import { DeleteRoundButton } from "@/components/rounds/delete-round-button";
import { getActiveAthleteId } from "@/lib/auth/athlete";
import { getRound } from "@/lib/rounds/queries";
import { formatPlayedOn, toParLabel } from "@/lib/rounds/format";
import {
  DETAIL_COUNT_FIELDS,
  DETAIL_FIELD_LABELS,
  ROUND_TYPE_LABELS,
} from "@/lib/schemas/round";
import { createClient } from "@/lib/supabase/server";

/**
 * A single round. Shows the scorecard core and the leak detail exactly as it was
 * recorded — crucially, a detail field that was never entered reads "Not
 * recorded", never a misleading 0 (that distinction is what keeps the leak
 * averages honest; see the stats engine and `lib/schemas/round.ts`).
 */
export default async function RoundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);
  if (!athleteId) redirect("/dashboard");

  const round = await getRound(supabase, athleteId, id);
  if (!round) notFound();

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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {round.course}
            </h1>
            <p className="text-sm text-muted-foreground">
              {formatPlayedOn(round.played_on)} ·{" "}
              {ROUND_TYPE_LABELS[round.round_type]} · {round.holes} holes
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href={`/rounds/${round.id}/edit`}
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              <Pencil aria-hidden />
              Edit
            </Link>
            <DeleteRoundButton
              roundId={round.id}
              courseLabel={`${round.course} on ${formatPlayedOn(round.played_on)}`}
            />
          </div>
        </div>
      </div>

      {/* Scorecard core */}
      <div className="grid grid-cols-3 gap-3">
        <ScoreCell label="Score" value={round.score} />
        <ScoreCell label="Par" value={round.par} />
        <ScoreCell label="To par" value={toParLabel(round.score, round.par)} />
      </div>

      {/* Leak detail — "Not recorded" where nothing was entered */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Detail
        </h2>
        <ScorecardTable>
          <thead>
            <tr>
              <th scope="col">Stat</th>
              <th scope="col" className="text-right">
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {DETAIL_COUNT_FIELDS.map((field) => {
              const value = round[field];
              return (
                <tr key={field}>
                  <td>{DETAIL_FIELD_LABELS[field]}</td>
                  <td className="numeric">
                    {value === null ? (
                      <span className="font-sans text-muted-foreground">
                        Not recorded
                      </span>
                    ) : (
                      value
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </ScorecardTable>
      </div>

      {round.notes ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Notes
          </h2>
          <p className="whitespace-pre-wrap rounded-lg border border-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground">
            {round.notes}
          </p>
        </div>
      ) : null}
    </section>
  );
}

/** One big scorecard figure — score, par, or to-par — in a bordered cell. */
function ScoreCell({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card px-3 py-4">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <DataValue className="text-3xl text-foreground">{value}</DataValue>
    </div>
  );
}
