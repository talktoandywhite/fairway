/** Loading skeleton for the edit-lesson form. */
export default function EditLessonLoading() {
  return (
    <section
      className="mx-auto flex w-full max-w-2xl animate-pulse flex-col gap-6"
      aria-hidden
    >
      <div className="flex flex-col gap-2">
        <div className="h-4 w-32 rounded-md bg-muted" />
        <div className="h-7 w-40 rounded-md bg-muted" />
        <div className="h-4 w-72 rounded-md bg-muted" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="h-16 w-full rounded-md bg-muted" />
        <div className="h-32 w-full rounded-md bg-muted" />
        <div className="h-40 w-full rounded-md bg-muted" />
      </div>
      <span className="sr-only">Loading…</span>
    </section>
  );
}
