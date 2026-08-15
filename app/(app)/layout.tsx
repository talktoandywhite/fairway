import Link from "next/link";

import { SignOutButton } from "./_components/sign-out-button";

/**
 * Layout for the signed-in `(app)` route group: dashboard, rounds, schedule,
 * practice, lessons, training, strength, settings. Route protection is enforced
 * in middleware (Session 5). The shell is deliberately minimal — a wordmark, a
 * short set of primary links, and a sign-out — because the athlete switcher and
 * full nav are later sessions; what it must carry now is a way out, always
 * reachable, and a way to the screens that exist. The pending-consent holding
 * screen also lives in this group and relies on the same sign-out.
 *
 * Dashboard, Rounds, and Schedule are linked today — the live screens; each later
 * session adds its own link as its screen lands. The nav scrolls horizontally
 * when the links outgrow the width (three of them already brush the 375px edge,
 * and more sessions are coming), while the wordmark and sign-out stay pinned so
 * the way out is always reachable.
 */
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col">
      <header className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          <Link
            href="/dashboard"
            className="shrink-0 text-lg font-semibold tracking-tight"
          >
            Fairway
          </Link>
          <nav
            aria-label="Primary"
            className="flex min-w-0 items-center gap-4 overflow-x-auto text-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <Link
              href="/dashboard"
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              Dashboard
            </Link>
            <Link
              href="/rounds"
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              Rounds
            </Link>
            <Link
              href="/schedule"
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              Schedule
            </Link>
          </nav>
        </div>
        <div className="shrink-0">
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>
    </div>
  );
}
