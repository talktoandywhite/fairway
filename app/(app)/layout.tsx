/**
 * Layout for the signed-in `(app)` route group: dashboard, rounds, schedule,
 * practice, lessons, training, strength, settings. Route protection and the app
 * shell (nav, athlete switcher) are added in later sessions; for now it is a
 * simple padded container.
 */
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6 md:py-8">
      {children}
    </div>
  );
}
