/** Loading skeleton for the Lesson Log. */
export default function LessonsLoading() {
  return (
    <section className="flex animate-pulse flex-col gap-6" aria-hidden>
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-28 rounded-md bg-muted" />
          <div className="h-4 w-72 rounded-md bg-muted" />
        </div>
        <div className="h-11 w-32 rounded-md bg-muted" />
      </div>
      <div className="h-44 w-full rounded-lg bg-muted" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 w-full rounded-lg bg-muted" />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-5 w-24 rounded-md bg-muted" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 w-full rounded-lg bg-muted" />
        ))}
      </div>
      <span className="sr-only">Loading your lesson log…</span>
    </section>
  );
}
