"use client";

import { Button } from "@/components/ui/button";

/**
 * Error boundary for the (auth) group. Keeps the tone calm — an auth hiccup is
 * a retry, not a catastrophe — and offers the one useful action.
 */
export default function AuthError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="flex flex-col gap-4" role="alert">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="text-sm text-muted-foreground">
          That didn&apos;t work as expected. Please try again.
        </p>
      </div>
      <Button type="button" onClick={reset} className="self-start">
        Try again
      </Button>
    </section>
  );
}
