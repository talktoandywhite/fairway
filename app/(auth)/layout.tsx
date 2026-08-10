/**
 * Layout for the signed-out `(auth)` route group: sign-in, sign-up, guardian
 * consent (Session 5). A centered, single-column shell for auth forms.
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-12">
      {children}
    </div>
  );
}
