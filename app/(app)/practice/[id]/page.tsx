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
import {
  SESSION_TYPE_HINTS,
  SESSION_TYPE_LABELS,
} from "@/lib/schemas/practice";
import { createClient } from "@/lib/supabase/server";

/**
 * A single practice session — what was worked on, for how long, and whatever the
 * athlete wrote down about it. Read-only detail plus edit and delete; nothing is
 * derived here, since the rollup and the mix are properties of a window, not of
 * one session.
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

  const typeLabel = SESSION_TYPE_LABELS[session.session_type];
  const label = `${formatMinutes(session.minutes)} of ${typeLabel.toLowerCase()} on ${formatPlayedOn(session.occurred_on)}`;

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
            <h1 className="text-2xl font-semibold tracking-tight">
              {typeLabel}
            </h1>
            <p className="text-sm text-muted-foreground">
              {formatPlayedOn(session.occurred_on)} ·{" "}
              {SESSION_TYPE_HINTS[session.session_type].toLowerCase()}
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

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <DetailCell
          label="Time"
          value={formatMinutes(session.minutes)}
          numeric
        />
        <DetailCell label="Focus" value={session.focus ?? "—"} />
        <DetailCell label="Drill" value={session.drill ?? "—"} />
      </dl>

      {session.result ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Result
          </h2>
          <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground">
            {session.result}
          </p>
        </div>
      ) : null}

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

/** One label + value in the detail grid. */
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
