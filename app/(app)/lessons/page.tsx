import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap, Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { HomeworkCallout } from "@/components/lessons/homework-callout";
import { LessonList } from "@/components/lessons/lesson-list";
import { LessonSummary } from "@/components/lessons/lesson-summary";
import { getActiveAthleteId } from "@/lib/auth/athlete";
import { getLessons } from "@/lib/lessons/queries";
import { homeworkPrompt } from "@/lib/lessons/present";
import { lessonSpendCents, outstandingHomework } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";

/**
 * The Lesson Log — every lesson the athlete has taken, newest first, with the
 * outstanding homework at the top.
 *
 * The order is deliberate: homework first, because it is the only thing on this
 * screen that changes what the athlete does today. The summary and the history
 * are the record underneath it.
 *
 * Every derived number comes from the stats engine (`lessonSpendCents`,
 * `outstandingHomework`) or the pure functions in `lib/lessons/present`; this page
 * reads rows and lays out the answers, never recomputing a metric itself
 * (CLAUDE.md, "Calculations").
 *
 * Lessons are athlete-authored in the MVP. Coach-authored entries arrive in
 * Session 18, which is why `coach_name` is free text and `coach_user_id` is left
 * alone here.
 */
export default async function LessonsPage() {
  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);
  // Parent/coach accounts (no athlete row) have no lesson log of their own; the
  // dashboard is where they land. Athlete resolution is server-side, always.
  if (!athleteId) redirect("/dashboard");

  const lessons = await getLessons(supabase, athleteId);
  const outstanding = outstandingHomework(lessons);
  const spendCents = lessonSpendCents(lessons);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Lessons</h1>
          <p className="text-sm text-muted-foreground">
            Your Lesson Log — what your coach said, and what you did about it.
          </p>
        </div>
        <Link
          href="/lessons/new"
          className={buttonVariants({ variant: "primary" })}
        >
          <Plus aria-hidden />
          Log a lesson
        </Link>
      </div>

      {lessons.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="size-6" aria-hidden />}
          title="No lessons logged yet"
          hint="Log a lesson and the swing key, the drill, and the homework stay with you — so the hour with your coach keeps working after you leave."
          action={
            <Link
              href="/lessons/new"
              className={buttonVariants({ variant: "primary" })}
            >
              Log your first lesson
            </Link>
          }
        />
      ) : (
        <>
          {outstanding ? (
            <HomeworkCallout prompt={homeworkPrompt(outstanding)} />
          ) : null}

          <LessonSummary
            lessonCount={lessons.length}
            spendCents={spendCents}
            // The query orders newest first, so the head of the list is the most
            // recent lesson — the same row the engine's homework rule reads.
            lastLessonOn={lessons[0]?.occurred_on ?? null}
          />

          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">History</h2>
            <LessonList lessons={lessons} />
          </div>
        </>
      )}
    </section>
  );
}
