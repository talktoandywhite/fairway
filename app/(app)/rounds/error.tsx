"use client";

import { Button } from "@/components/ui/button";

/**
 * Error boundary for the Score Log (list, new, detail, edit — it covers the whole
 * `rounds` segment tree). A failed read or write shows a recoverable message, not
 * a blank screen.
 */
export default function RoundsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="mx-auto flex max-w-lg flex-col gap-4" role="alert">
      <h1 className="text-2xl font-semibold tracking-tight">
        We couldn&apos;t load your rounds
      </h1>
      <p className="text-sm text-muted-foreground">
        Something went wrong reaching your Score Log. Please try again in a
        moment.
      </p>
      <Button type="button" onClick={reset} className="self-start">
        Try again
      </Button>
    </section>
  );
}
