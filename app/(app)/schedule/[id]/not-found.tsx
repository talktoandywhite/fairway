import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

/**
 * Shown when an event id doesn't resolve — a deleted event, a stale link, or an
 * event belonging to someone else (RLS returns nothing, which lands here rather
 * than leaking that the row exists).
 */
export default function EventNotFound() {
  return (
    <section className="mx-auto flex max-w-lg flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        We couldn&apos;t find that event
      </h1>
      <p className="text-sm text-muted-foreground">
        It may have been deleted, or the link is out of date.
      </p>
      <Link
        href="/schedule"
        className={buttonVariants({ variant: "primary" }) + " self-start"}
      >
        Back to schedule
      </Link>
    </section>
  );
}
