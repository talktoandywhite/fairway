"use client";

import { Button } from "@/components/ui/button";

/**
 * Error boundary for the dashboard. A failed read shows a recoverable message,
 * not a blank landing page — this is the first screen after sign-in, so it must
 * never dead-end.
 */
export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="mx-auto flex max-w-lg flex-col gap-4" role="alert">
      <h1 className="text-2xl font-semibold tracking-tight">
        We couldn&apos;t load your dashboard
      </h1>
      <p className="text-sm text-muted-foreground">
        Something went wrong pulling your numbers together. Please try again in
        a moment.
      </p>
      <Button type="button" onClick={reset} className="self-start">
        Try again
      </Button>
    </section>
  );
}
