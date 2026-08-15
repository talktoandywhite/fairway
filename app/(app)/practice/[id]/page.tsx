import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { DataValue } from "@/components/ui/data-value";
import { DeletePracticeButton } from "@/components/practice/delete-practice-button";
import { getActiveAthleteId } from "@/lib/auth/athlete";
import { formatMinutes } from "@/lib/practice/format";
import { getPracticeSession } from "@/lib/practice/queries";
import { formatPlayedOn } from "@/lib/rounds/format";
import { SESSION_TYPE_LABELS } from "@/lib/schemas/practice";
import { createClient } from "@/lib/supabase/server";

/**
 * A single practice session — the day's block, broken into the disciplines it
 * covered, each with its own minutes and whatever the athlete wrote against it.
 * Nothing is derived here: the rollup and the mix are properties of a window, not
 * of one session.
 */
export default async function PracticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);
  if (!athleteId) redirect("/dashboard");

  const session = await getPracticeSession(supabase, athleteId, id);
  if (!session) notFound();

  const minutes = session.segments.reduce((sum, s) => sum + s.minutes, 0);
  const title = session.segments
    .map((s) => SESSION_TYPE_LABELS[s.session_type])
    .join(" · ");
  const label = `${formatMinutes(minutes)} on ${formatPlayedOn(session.occurred_on)}`;

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/practice"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft aria-hidden className="size-4" />
          Back to practice
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">
              {formatPlayedOn(session.occurred_on)} ·{" "}
              <DataValue>{formatMinutes(minutes)}</DataValue>
              {session.segments.length > 1
                ? ` across ${session.segments.length} parts`
                : ""}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href={`/practice/${session.id}/edit`}
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              <Pencil aria-hidden />
              Edit
            </Link>
            <DeletePracticeButton sessionId={session.id} sessionLabel={label} />
          </div>
        </div>
      </div>

      {/* One block per discipline. Detail sits with the discipline it describes. */}
      <ul className="flex flex-col gap-3">
        {session.segments.map((segment) => (
          <li
            key={segment.id}
            className="flex flex-col gap-2 rounded-lg border border-border bg-card px-4 py-3"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <h2 className="font-medium text-foreground">
                {SESSION_TYPE_LABELS[segment.session_type]}
              </h2>
              <DataValue className="text-lg text-foreground">
                {formatMinutes(segment.minutes)}
              </DataValue>
            </div>
            {segment.focus || segment.drill || segment.result ? (
              <dl className="flex flex-col gap-1 text-sm">
                {segment.focus ? (
                  <Detail label="Focus" value={segment.focus} />
                ) : null}
                {segment.drill ? (
                  <Detail label="Drill" value={segment.drill} />
                ) : null}
                {segment.result ? (
                  <Detail label="Result" value={segment.result} />
                ) : null}
              </dl>
            ) : null}
          </li>
        ))}
      </ul>

      {session.notes ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Notes
          </h2>
          <p className="whitespace-pre-wrap rounded-lg border border-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground">
            {session.notes}
          </p>
        </div>
      ) : null}
    </section>
  );
}

/** One labelled line of a segment's detail. */
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap gap-x-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}
