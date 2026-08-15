/** Loading skeleton for the Practice Log. */
export default function PracticeLoading() {
  return (
    <section className="flex animate-pulse flex-col gap-6" aria-hidden>
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-32 rounded-md bg-muted" />
          <div className="h-4 w-72 rounded-md bg-muted" />
        </div>
        <div className="h-11 w-32 rounded-md bg-muted" />
      </div>
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-11 w-20 rounded-full bg-muted" />
        ))}
      </div>
      <div className="h-72 w-full rounded-lg bg-muted" />
      <div className="h-64 w-full rounded-lg bg-muted" />
      <div className="flex flex-col gap-2">
        <div className="h-5 w-24 rounded-md bg-muted" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 w-full rounded-lg bg-muted" />
        ))}
      </div>
      <span className="sr-only">Loading your practice log…</span>
    </section>
  );
}
