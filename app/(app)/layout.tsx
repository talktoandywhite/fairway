import Link from "next/link";

import { SignOutButton } from "./_components/sign-out-button";

/**
 * Layout for the signed-in `(app)` route group: dashboard, rounds, schedule,
 * practice, lessons, training, strength, settings. Route protection is enforced
 * in middleware (Session 5). The shell is deliberately minimal — a wordmark and
 * a sign-out — because the athlete switcher and full nav are later sessions;
 * what it must carry now is a way out, always reachable, for both the normal
 * app and the pending-consent holding screen that also lives in this group.
 */
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col">
      <header className="flex items-center justify-between px-4 py-3 md:px-6">
        <Link
          href="/dashboard"
          className="text-lg font-semibold tracking-tight"
        >
          Fairway
        </Link>
        <SignOutButton />
      </header>
      <main className="flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>
    </div>
  );
}
