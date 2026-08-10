"use client";

import { Button } from "@/components/ui/button";

/**
 * Error boundary for /styleguide. Every route segment ships one (CLAUDE.md).
 */
export default function StyleguideError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-2xl">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        The styleguide failed to render.
        {error.digest ? ` (ref: ${error.digest})` : null}
      </p>
      <Button variant="secondary" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
