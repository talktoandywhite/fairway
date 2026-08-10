/**
 * Loading state for /styleguide. The page is static today, so this rarely
 * paints — but every route segment ships loading and error states, not a
 * follow-up ticket (CLAUDE.md).
 */
export default function StyleguideLoading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="h-4 w-80 max-w-full animate-pulse rounded bg-muted" />
      <div className="mt-4 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
      </div>
      <span className="sr-only">Loading the styleguide…</span>
    </div>
  );
}
