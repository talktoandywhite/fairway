/** Loading skeleton for the dashboard — mirrors the real layout so the shift on
 * load is minimal (header, headline row, chart, and the widget grid). */
export default function DashboardLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-8" aria-hidden>
      <div className="flex flex-col gap-2">
        <div className="h-7 w-40 rounded-md bg-muted" />
        <div className="h-4 w-64 rounded-md bg-muted" />
      </div>

      <div className="flex flex-col gap-4">
        <div className="h-28 w-full rounded-lg bg-muted" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="h-24 rounded-lg bg-muted" />
          <div className="h-24 rounded-lg bg-muted" />
          <div className="h-24 rounded-lg bg-muted" />
        </div>
      </div>

      <div className="h-80 w-full rounded-lg bg-muted" />
      <div className="h-64 w-full rounded-lg bg-muted" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-40 rounded-lg bg-muted" />
        <div className="h-40 rounded-lg bg-muted" />
      </div>

      <span className="sr-only">Loading your dashboard…</span>
    </div>
  );
}
