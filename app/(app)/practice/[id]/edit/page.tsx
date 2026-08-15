import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { PracticeForm } from "@/components/practice/practice-form";
import { getActiveAthleteId } from "@/lib/auth/athlete";
import { getPracticeSession } from "@/lib/practice/queries";
import type { PracticeSessionWithSegments } from "@/lib/practice/queries";
import { SESSION_TYPE_LABELS } from "@/lib/schemas/practice";
import type { PracticeFormValues } from "@/lib/schemas/practice";
import { formatPlayedOn } from "@/lib/rounds/format";
import { createClient } from "@/lib/supabase/server";

/**
 * Edit a logged practice session. Same form as new, prefilled — each segment's
 * stored integer `minutes` loads back as the string its input holds, and the
 * shared schema re-coerces it on save. Saving replaces the session's whole set of
 * segments, so dropping a discipline here really drops it.
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

  const title = session.segments
    .map((s) => SESSION_TYPE_LABELS[s.session_type])
    .join(" · ");

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
          {title} on {formatPlayedOn(session.occurred_on)} · update anything
          that changed.
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

/** Map a stored session onto the form's value shape — each segment's minutes as
 * the string its number input holds. */
function toFormValues(
  session: PracticeSessionWithSegments,
): PracticeFormValues {
  return {
    occurred_on: session.occurred_on,
    notes: session.notes,
    segments: session.segments.map((segment) => ({
      session_type: segment.session_type,
      minutes: String(segment.minutes),
      focus: segment.focus,
      drill: segment.drill,
      result: segment.result,
    })),
  };
}
