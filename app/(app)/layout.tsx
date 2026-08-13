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
 * Only Dashboard and Rounds are linked today because they are the only two live
 * screens; each later session adds its own link as its screen lands.
 */
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col">
      <header className="flex items-center justify-between gap-4 px-4 py-3 md:px-6">
        <div className="flex items-center gap-5">
          <Link
            href="/dashboard"
            className="text-lg font-semibold tracking-tight"
          >
            Fairway
          </Link>
          <nav aria-label="Primary" className="flex items-center gap-4 text-sm">
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground"
            >
              Dashboard
            </Link>
            <Link
              href="/rounds"
              className="text-muted-foreground hover:text-foreground"
            >
              Rounds
            </Link>
          </nav>
        </div>
        <SignOutButton />
      </header>
      <main className="flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>
    </div>
  );
}
