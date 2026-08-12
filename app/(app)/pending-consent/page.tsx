import { redirect } from "next/navigation";
import { CircleCheck, Clock } from "lucide-react";

import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

import { ResendConsentForm } from "./resend-form";

/**
 * The holding screen for an under-13 account waiting on guardian consent.
 *
 * Route protection in middleware keeps a pending athlete here and everyone else
 * out, but this page defends its own preconditions too: it re-checks the
 * account and, if it has since been activated (or the visitor is not an
 * age-gated athlete), sends them on to the dashboard. The screen never shows the
 * consent token — that secret belongs only in the guardian's email, never on the
 * athlete's own screen, or the gate would be self-serve.
 *
 * Tone follows CLAUDE.md: honest and warm, never a scold. This is a normal step
 * for a young player, not an error.
 */
export default async function PendingConsentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: athlete } = await supabase
    .from("athletes")
    .select("id, consent_status")
    .eq("user_id", user.id)
    .single();

  // No athlete row, or already active — nothing to wait for here.
  if (!athlete || athlete.consent_status === "active") {
    redirect("/dashboard");
  }

  // The most recent consent request tells us which guardian we emailed and
  // whether it has been verified yet. Owner-only RLS scopes this to their own.
  const { data: request } = await supabase
    .from("guardian_consent_requests")
    .select("guardian_email, verified_at, created_at")
    .eq("athlete_id", athlete.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const guardianEmail = request?.guardian_email ?? "";

  return (
    <section className="mx-auto flex max-w-lg flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-secondary-strong">
          <Clock aria-hidden className="size-4" />
          Waiting on a grown-up
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">
          Your account is almost ready
        </h1>
        <p className="text-balance text-muted-foreground">
          Because you&apos;re under 13, a parent or guardian has to say
          it&apos;s OK before Fairway can start saving your rounds. That keeps
          your information safe — it&apos;s the law, and it&apos;s a good rule.
        </p>
      </div>

      <Card className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CircleCheck aria-hidden className="size-4 text-secondary-strong" />
          What happens next
        </div>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-muted-foreground">
          <li>
            {guardianEmail ? (
              <>
                We emailed{" "}
                <span className="font-medium text-foreground">
                  {guardianEmail}
                </span>{" "}
                a link.
              </>
            ) : (
              <>We emailed your parent or guardian a link.</>
            )}
          </li>
          <li>
            They open it and confirm they&apos;re OK with you using Fairway.
          </li>
          <li>Your account switches on and you can start logging rounds.</li>
        </ol>
        <p className="text-sm text-muted-foreground">
          You can leave this page — we&apos;ll have everything ready the next
          time you sign in after they&apos;ve said yes.
        </p>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Didn&apos;t get it?
        </h2>
        <p className="text-sm text-muted-foreground">
          Check the email is right and we&apos;ll send the link again.
        </p>
        <ResendConsentForm defaultEmail={guardianEmail} />
      </div>
    </section>
  );
}
