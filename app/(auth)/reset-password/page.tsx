import { ResetPasswordForm } from "./reset-password-form";

/**
 * Set a new password from a recovery link. The link is exchanged for a session
 * by /auth/callback before landing here, so this page assumes an authenticated
 * recovery session and the action fails gracefully if it has expired.
 */
export default function ResetPasswordPage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Choose a new password
        </h1>
        <p className="text-sm text-muted-foreground">
          Pick something you&apos;ll remember. You&apos;ll be signed in right
          after.
        </p>
      </div>

      <ResetPasswordForm />
    </section>
  );
}
