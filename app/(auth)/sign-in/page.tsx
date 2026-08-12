import Link from "next/link";

import { SignInForm } from "./sign-in-form";

/**
 * Sign in. `redirect` (a same-origin path) is honoured after a successful
 * password sign-in; the server action re-narrows it so it can only ever be an
 * in-app path.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to pick up where you left off.
        </p>
      </div>

      <SignInForm redirect={redirect} />

      <p className="text-sm text-muted-foreground">
        New to Fairway?{" "}
        <Link
          href="/sign-up"
          className="font-medium text-secondary-strong underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </section>
  );
}
