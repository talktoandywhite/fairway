/** Loading fallback for the pending-consent holding screen. */
export default function PendingConsentLoading() {
  return (
    <div
      className="mx-auto flex max-w-lg animate-pulse flex-col gap-6"
      aria-hidden
    >
      <div className="flex flex-col gap-2">
        <div className="h-4 w-40 rounded-md bg-muted" />
        <div className="h-7 w-3/4 rounded-md bg-muted" />
        <div className="h-4 w-full rounded-md bg-muted" />
      </div>
      <div className="h-40 w-full rounded-lg bg-muted" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
