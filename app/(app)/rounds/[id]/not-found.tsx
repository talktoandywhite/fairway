import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

/**
 * Shown when a round id doesn't resolve — a deleted round, a stale link, or a
 * round belonging to someone else (RLS returns nothing, which lands here rather
 * than leaking that the row exists).
 */
export default function RoundNotFound() {
  return (
    <section className="mx-auto flex max-w-lg flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        We couldn&apos;t find that round
      </h1>
      <p className="text-sm text-muted-foreground">
        It may have been deleted, or the link is out of date.
      </p>
      <Link
        href="/rounds"
        className={buttonVariants({ variant: "primary" }) + " self-start"}
      >
        Back to rounds
      </Link>
    </section>
  );
}
