import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { PracticeForm } from "@/components/practice/practice-form";
import { getActiveAthleteId } from "@/lib/auth/athlete";
import { createClient } from "@/lib/supabase/server";

/**
 * Log a practice session. Date, type, and minutes are the whole required form —
 * everything else is behind "Add detail". A session logged in the car park is
 * worth more than a perfect one that never gets written down.
 */
export default async function NewPracticePage() {
  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);
  if (!athleteId) redirect("/dashboard");

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
        <h1 className="text-2xl font-semibold tracking-tight">Log a session</h1>
        <p className="text-sm text-muted-foreground">
          What you worked on and for how long. That&apos;s all it takes — add
          the detail if you want to remember it.
        </p>
      </div>

      <PracticeForm mode="create" />
    </section>
  );
}
