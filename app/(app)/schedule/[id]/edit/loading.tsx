/** Loading skeleton for the edit-event form. */
export default function EditEventLoading() {
  return (
    <section
      className="mx-auto flex w-full max-w-2xl animate-pulse flex-col gap-6"
      aria-hidden
    >
      <div className="flex flex-col gap-2">
        <div className="h-4 w-28 rounded-md bg-muted" />
        <div className="h-7 w-36 rounded-md bg-muted" />
        <div className="h-4 w-64 rounded-md bg-muted" />
      </div>
      <div className="flex flex-col gap-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 w-full rounded-md bg-muted" />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </section>
  );
}
