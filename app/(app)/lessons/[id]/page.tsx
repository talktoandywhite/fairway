import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { DataValue } from "@/components/ui/data-value";
import { DeleteLessonButton } from "@/components/lessons/delete-lesson-button";
import { HomeworkBadge } from "@/components/lessons/homework-badge";
import { getActiveAthleteId } from "@/lib/auth/athlete";
import { formatCostCents, lessonTitle } from "@/lib/lessons/format";
import { getLesson } from "@/lib/lessons/queries";
import { formatPlayedOn } from "@/lib/rounds/format";
import { createClient } from "@/lib/supabase/server";

/**
 * A single lesson — what the coach said, what they gave you to do, and what it
 * cost. Nothing is derived here: the spend and the outstanding-homework verdict
 * are properties of the whole log, not of one lesson.
 *
 * Sections render only when the athlete wrote something in them. A lesson logged
 * as a date and a coach's name reads as exactly that, rather than as a page of
 * empty labels.
 */
export default async function LessonDetailPage({
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

  const title = lessonTitle(lesson.coach_name);
  const date = formatPlayedOn(lesson.occurred_on);
  const label = `${title} on ${date}`;
  const hasHomework = !!(lesson.drill_assigned || lesson.homework_target);

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/lessons"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft aria-hidden className="size-4" />
          Back to lessons
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">
              {date}
              {lesson.cost_cents !== null ? (
                <>
                  {" · "}
                  <DataValue>{formatCostCents(lesson.cost_cents)}</DataValue>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href={`/lessons/${lesson.id}/edit`}
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              <Pencil aria-hidden />
              Edit
            </Link>
            <DeleteLessonButton lessonId={lesson.id} lessonLabel={label} />
          </div>
        </div>
      </div>

      {lesson.swing_key ? (
        <Section title="Swing key">
          <p className="text-base leading-relaxed text-foreground">
            {lesson.swing_key}
          </p>
        </Section>
      ) : null}

      {hasHomework ? (
        <Section title="Homework">
          <dl className="flex flex-col gap-2 text-sm">
            {lesson.drill_assigned ? (
              <Detail label="Drill" value={lesson.drill_assigned} />
            ) : null}
            {lesson.homework_target ? (
              <Detail label="Target" value={lesson.homework_target} />
            ) : null}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <dt className="text-muted-foreground">Did you get to it?</dt>
              <dd>
                <HomeworkBadge status={lesson.homework_done} />
              </dd>
            </div>
          </dl>
        </Section>
      ) : null}

      {lesson.what_changed ? (
        <Section title="What changed">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {lesson.what_changed}
          </p>
        </Section>
      ) : null}

      {!lesson.swing_key && !hasHomework && !lesson.what_changed ? (
        <p className="rounded-lg border border-dashed border-input px-4 py-6 text-center text-sm text-muted-foreground">
          Only the date is recorded for this one.{" "}
          <Link
            href={`/lessons/${lesson.id}/edit`}
            className="font-medium text-foreground underline underline-offset-4"
          >
            Add the swing key and the homework
          </Link>{" "}
          while you still remember them.
        </p>
      ) : null}
    </section>
  );
}

/** One titled block of the lesson, on the card reading surface. */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="rounded-lg border border-border bg-card px-4 py-3">
        {children}
      </div>
    </div>
  );
}

/** One labelled line inside a section. */
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap gap-x-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}
