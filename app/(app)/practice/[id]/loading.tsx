/** Loading skeleton for a practice session's detail page. */
export default function PracticeDetailLoading() {
  return (
    <section
      className="mx-auto flex w-full max-w-2xl animate-pulse flex-col gap-6"
      aria-hidden
    >
      <div className="flex flex-col gap-2">
        <div className="h-4 w-32 rounded-md bg-muted" />
        <div className="h-7 w-48 rounded-md bg-muted" />
        <div className="h-4 w-64 rounded-md bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 w-full rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-20 w-full rounded-lg bg-muted" />
      <span className="sr-only">Loading this session…</span>
    </section>
  );
}
