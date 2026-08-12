import Link from "next/link";

import { ForgotPasswordForm } from "./forgot-password-form";

/** Request a password reset. The link in the email lands on /reset-password. */
export default function ForgotPasswordPage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Reset your password
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a link to set a new password.
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-secondary-strong underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </section>
  );
}
