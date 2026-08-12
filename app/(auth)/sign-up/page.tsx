import Link from "next/link";

import { SignUpForm } from "./sign-up-form";

/**
 * Create an account. This is the only flow that collects a date of birth, and
 * so the only one that can arm the COPPA consent gate — magic-link sign-in is
 * deliberately sign-in only for exactly this reason.
 */
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Start tracking your rounds, your schedule, and your progress toward
          the goal.
        </p>
      </div>

      <SignUpForm redirect={redirect} />

      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-secondary-strong underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </section>
  );
}
