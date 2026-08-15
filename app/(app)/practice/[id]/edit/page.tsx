import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { PracticeForm } from "@/components/practice/practice-form";
import { getActiveAthleteId } from "@/lib/auth/athlete";
import { getPracticeSession } from "@/lib/practice/queries";
import { SESSION_TYPE_LABELS } from "@/lib/schemas/practice";
import type { PracticeFormValues } from "@/lib/schemas/practice";
import { formatPlayedOn } from "@/lib/rounds/format";
import type { PracticeSessionRow } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";

/**
 * Edit a logged practice session. Same form as new, prefilled — the stored
 * integer `minutes` loads back as the string the input holds, and the shared
 * schema re-coerces it on save.
 */
export default async function EditPracticePage({
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

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href={`/practice/${session.id}`}
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft aria-hidden className="size-4" />
          Back to session
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Edit session</h1>
        <p className="text-sm text-muted-foreground">
          {SESSION_TYPE_LABELS[session.session_type]} on{" "}
          {formatPlayedOn(session.occurred_on)} · update anything that changed.
        </p>
      </div>

      <PracticeForm
        mode="edit"
        sessionId={session.id}
        initialValues={toFormValues(session)}
      />
    </section>
  );
}

/** Map a stored session onto the form's value shape — minutes as the string the
 * number input holds. */
function toFormValues(session: PracticeSessionRow): PracticeFormValues {
  return {
    occurred_on: session.occurred_on,
    session_type: session.session_type,
    minutes: String(session.minutes),
    focus: session.focus,
    drill: session.drill,
    result: session.result,
    notes: session.notes,
  };
}
