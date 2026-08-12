import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Fairway</h1>
      <p className="max-w-md text-balance text-muted-foreground">
        Plan, track, and improve your competitive golf. One place that answers a
        single question: am I getting there?
      </p>
      <nav className="flex gap-4" aria-label="Primary">
        <Link
          href="/sign-in"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="rounded-md border border-input px-4 py-2 text-sm font-medium"
        >
          Create account
        </Link>
      </nav>
    </main>
  );
}
