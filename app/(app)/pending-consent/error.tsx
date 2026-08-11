"use client";

import { Button } from "@/components/ui/button";

/** Error boundary for the pending-consent holding screen. */
export default function PendingConsentError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="mx-auto flex max-w-lg flex-col gap-4" role="alert">
      <h1 className="text-2xl font-semibold tracking-tight">
        We couldn&apos;t load this
      </h1>
      <p className="text-sm text-muted-foreground">
        Please try again in a moment.
      </p>
      <Button type="button" onClick={reset} className="self-start">
        Try again
      </Button>
    </section>
  );
}
