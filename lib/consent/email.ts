/**
 * Guardian consent email — the message that carries the verification link to a
 * parent of an under-13 athlete.
 *
 * The MVP has no configured transactional email provider (CLAUDE.md defers that
 * infrastructure), so this is a deterministic stand-in: it constructs the link
 * and records the intent server-side. Wiring a real provider (Resend, Postmark,
 * SES) is a one-function change here — the callers and the DB token flow do not
 * move. The consent *token* is the durable artifact; it lives in
 * guardian_consent_requests and is what actually unfreezes the account, so the
 * flow is fully testable without a live mailbox.
 *
 * Keep this module server-only: it is imported solely by Server Actions
 * (`app/(auth)/actions.ts`). A guardian's email address is another person's PII
 * and must never reach the client bundle.
 */

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/**
 * The URL a guardian clicks to consent. `/consent` reads the token, shows the
 * athlete's name, and posts it to the verify action on an explicit click — a
 * human action, never a bare GET side effect.
 */
export function guardianConsentUrl(token: string): string {
  const base = siteUrl().replace(/\/$/, "");
  return `${base}/consent?token=${encodeURIComponent(token)}`;
}

export type GuardianConsentEmail = {
  to: string;
  athleteName: string;
  token: string;
};

/**
 * "Send" the guardian consent email. Returns the constructed link so a caller
 * can decide what to surface (never the token to the athlete's own screen). In
 * MVP this logs the intended message server-side; swap the body of the `else`
 * branch for a provider call when one is configured.
 */
export async function sendGuardianConsentEmail({
  to,
  athleteName,
  token,
}: GuardianConsentEmail): Promise<{ consentUrl: string }> {
  const consentUrl = guardianConsentUrl(token);

  // A single seam for the real provider. Until one is configured, we do not
  // pretend to have sent anything — we record it plainly in the server log so
  // it is obvious in development that delivery is a stand-in.
  console.info(
    `[consent] guardian email not delivered (no mail provider configured). ` +
      `Would send to ${to} for athlete "${athleteName}": ${consentUrl}`,
  );

  return { consentUrl };
}
