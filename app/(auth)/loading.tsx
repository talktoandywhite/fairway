/**
 * Loading fallback for the (auth) group. A quiet skeleton in the shape of a
 * heading and a couple of fields, so the centered shell doesn't flash empty.
 */
export default function AuthLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-hidden>
      <div className="flex flex-col gap-2">
        <div className="h-7 w-2/3 rounded-md bg-muted" />
        <div className="h-4 w-full rounded-md bg-muted" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="h-11 w-full rounded-md bg-muted" />
        <div className="h-11 w-full rounded-md bg-muted" />
        <div className="h-11 w-full rounded-md bg-muted" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
