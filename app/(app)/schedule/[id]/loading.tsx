/** Loading skeleton for an event's detail page. */
export default function EventDetailLoading() {
  return (
    <section
      className="mx-auto flex w-full max-w-2xl animate-pulse flex-col gap-6"
      aria-hidden
    >
      <div className="flex flex-col gap-2">
        <div className="h-4 w-32 rounded-md bg-muted" />
        <div className="h-7 w-56 rounded-md bg-muted" />
        <div className="h-4 w-40 rounded-md bg-muted" />
        <div className="flex gap-2">
          <div className="h-6 w-24 rounded-full bg-muted" />
          <div className="h-6 w-20 rounded-full bg-muted" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 w-full rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-11 w-40 rounded-md bg-muted" />
      <span className="sr-only">Loading this event…</span>
    </section>
  );
}
