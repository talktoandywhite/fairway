import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { LessonForm } from "@/components/lessons/lesson-form";
import { getActiveAthleteId } from "@/lib/auth/athlete";
import { createClient } from "@/lib/supabase/server";

/**
 * Log a lesson. The date is the only required field — everything else can be
 * filled in from the edit form later. A lesson recorded in the car park with a
 * coach's name on it is worth more than a perfect entry that never gets written.
 */
export default async function NewLessonPage() {
  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);
  if (!athleteId) redirect("/dashboard");

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
        <h1 className="text-2xl font-semibold tracking-tight">Log a lesson</h1>
        <p className="text-sm text-muted-foreground">
          The swing key and the homework are the parts that keep working after
          you leave. Everything here is optional except the date.
        </p>
      </div>

      <LessonForm mode="create" />
    </section>
  );
}
