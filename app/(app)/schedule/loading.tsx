/** Loading skeleton for the Tournament Plan. */
export default function ScheduleLoading() {
  return (
    <section className="flex animate-pulse flex-col gap-6" aria-hidden>
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-36 rounded-md bg-muted" />
          <div className="h-4 w-64 rounded-md bg-muted" />
        </div>
        <div className="h-11 w-28 rounded-md bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 w-full rounded-lg bg-muted" />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-4 w-28 rounded-md bg-muted" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 w-full rounded-lg bg-muted" />
        ))}
      </div>
      <span className="sr-only">Loading your schedule…</span>
    </section>
  );
}
