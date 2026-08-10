/**
 * Placeholder. The real "am I getting there" dashboard arrives in Session 9,
 * once the schema (Session 6) and stats engine (Session 7) exist. This exists so
 * the `(app)` group is a live route.
 */
export default function DashboardPage() {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="text-sm text-muted-foreground">
        Your scoring average, gap to goal, and trend will live here — coming in
        Session 9.
      </p>
    </section>
  );
}
