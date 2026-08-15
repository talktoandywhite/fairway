import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

/**
 * Shown when a lesson id doesn't resolve — a deleted lesson, a stale link, or one
 * belonging to someone else (RLS returns nothing, which lands here rather than
 * leaking that the row exists).
 */
export default function LessonNotFound() {
  return (
    <section className="mx-auto flex max-w-lg flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        We couldn&apos;t find that lesson
      </h1>
      <p className="text-sm text-muted-foreground">
        It may have been deleted, or the link is out of date.
      </p>
      <Link
        href="/lessons"
        className={buttonVariants({ variant: "primary" }) + " self-start"}
      >
        Back to lessons
      </Link>
    </section>
  );
}
