import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { LessonForm } from "@/components/lessons/lesson-form";
import { getActiveAthleteId } from "@/lib/auth/athlete";
import { costCentsToDollarsInput, lessonTitle } from "@/lib/lessons/format";
import { getLesson } from "@/lib/lessons/queries";
import type { LessonFormValues } from "@/lib/schemas/lesson";
import { formatPlayedOn } from "@/lib/rounds/format";
import type { LessonRow } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";

/**
 * Edit a logged lesson. Same form as new, prefilled — the stored integer
 * `cost_cents` loads back as the dollars string its input holds, and the shared
 * schema re-converts it on save.
 *
 * This is also the screen an athlete comes back to when the homework finally gets
 * done, which is why "Did you get to it?" is a first-class field rather than a
 * detail hidden behind a disclosure.
 */
export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);
  if (!athleteId) redirect("/dashboard");

  const lesson = await getLesson(supabase, athleteId, id);
  if (!lesson) notFound();

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href={`/lessons/${lesson.id}`}
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft aria-hidden className="size-4" />
          Back to lesson
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Edit lesson</h1>
        <p className="text-sm text-muted-foreground">
          {lessonTitle(lesson.coach_name)} on{" "}
          {formatPlayedOn(lesson.occurred_on)} · update anything that changed.
        </p>
      </div>

      <LessonForm
        mode="edit"
        lessonId={lesson.id}
        initialValues={toFormValues(lesson)}
      />
    </section>
  );
}

/** Map a stored lesson onto the form's value shape — the cost as the dollars
 * string its input holds, and a null homework status as the select's "" (which
 * is "not answered", not "no"). */
function toFormValues(lesson: LessonRow): LessonFormValues {
  return {
    occurred_on: lesson.occurred_on,
    coach_name: lesson.coach_name,
    swing_key: lesson.swing_key,
    drill_assigned: lesson.drill_assigned,
    homework_target: lesson.homework_target,
    homework_done: lesson.homework_done ?? "",
    cost: costCentsToDollarsInput(lesson.cost_cents),
    what_changed: lesson.what_changed,
  };
}
