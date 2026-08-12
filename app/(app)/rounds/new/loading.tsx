/** Loading skeleton for the new-round form. */
export default function NewRoundLoading() {
  return (
    <section
      className="mx-auto flex w-full max-w-2xl animate-pulse flex-col gap-6"
      aria-hidden
    >
      <div className="flex flex-col gap-2">
        <div className="h-4 w-28 rounded-md bg-muted" />
        <div className="h-7 w-40 rounded-md bg-muted" />
        <div className="h-4 w-full rounded-md bg-muted" />
      </div>
      <div className="flex flex-col gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="h-4 w-24 rounded-md bg-muted" />
            <div className="h-11 w-full rounded-md bg-muted" />
          </div>
        ))}
      </div>
      <div className="h-12 w-full rounded-lg bg-muted" />
      <span className="sr-only">Loading the round form…</span>
    </section>
  );
}
