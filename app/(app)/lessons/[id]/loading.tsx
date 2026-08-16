/** Loading skeleton for a lesson's detail page. */
export default function LessonDetailLoading() {
  return (
    <section
      className="mx-auto flex w-full max-w-2xl animate-pulse flex-col gap-6"
      aria-hidden
    >
      <div className="flex flex-col gap-2">
        <div className="h-4 w-32 rounded-md bg-muted" />
        <div className="h-7 w-56 rounded-md bg-muted" />
        <div className="h-4 w-48 rounded-md bg-muted" />
      </div>
      <div className="h-20 w-full rounded-lg bg-muted" />
      <div className="h-32 w-full rounded-lg bg-muted" />
      <div className="h-24 w-full rounded-lg bg-muted" />
      <span className="sr-only">Loading this lesson…</span>
    </section>
  );
}
