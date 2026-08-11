import { sendEmail } from "@/lib/email/send";

/**
 * Guardian consent email — the message that carries the verification link to a
 * parent of an under-13 athlete.
 *
 * The content is built by a pure function (unit-tested, no I/O); delivery goes
 * through the shared `sendEmail` seam, which uses Resend when configured and
 * otherwise logs the intent. The consent *token* is the durable artifact — it
 * lives in `guardian_consent_requests` and is what actually unfreezes the
 * account — so the flow is testable, and recoverable via resend, even when mail
 * delivery is unavailable.
 *
 * Keep this module server-only: it is imported by Server Actions and the auth
 * callback. A guardian's email address is another person's PII and must never
 * reach the client bundle.
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

/** Minimal HTML escaping for user-supplied text (the athlete's display name). */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Build the guardian consent email. Pure and deterministic so it can be unit
 * tested; the tone follows CLAUDE.md — warm and plain, explaining why this step
 * exists rather than demanding action. The athlete name is escaped because it is
 * user-supplied; the consent URL carries a random uuid token and is safe.
 */
export function buildGuardianConsentEmail({
  athleteName,
  consentUrl,
}: {
  athleteName: string;
  consentUrl: string;
}): { subject: string; html: string; text: string } {
  const name = athleteName.trim() || "A young golfer";
  const safeName = escapeHtml(name);

  const subject = `${name} needs your OK to use Fairway`;

  const text = [
    `Hi,`,
    ``,
    `${name} signed up for Fairway, an app for tracking and improving their golf, and listed you as their parent or guardian.`,
    ``,
    `Because they're under 13, their account can't save anything until you say it's OK. If you're happy for them to use it, confirm here:`,
    ``,
    consentUrl,
    ``,
    `Fairway stores only what's needed to track their game — scores, practice, and schedule. There are no public profiles and no messaging between players. If you'd rather they didn't use it, you can simply ignore this email and the account stays switched off.`,
    ``,
    `Thanks,`,
    `The Fairway team`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f6f4ee;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#173624;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <tr><td>
        <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;">${safeName} needs your OK to use Fairway</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
          ${safeName} signed up for Fairway, an app for tracking and improving their golf, and listed you as their parent or guardian.
        </p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
          Because they&rsquo;re under 13, their account can&rsquo;t save anything until you say it&rsquo;s OK.
        </p>
        <p style="margin:0 0 24px;">
          <a href="${consentUrl}" style="display:inline-block;background:#195733;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 20px;border-radius:8px;">
            Yes, I give my consent
          </a>
        </p>
        <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#4b715b;">
          Fairway stores only what&rsquo;s needed to track their game &mdash; scores, practice, and schedule. There are no public profiles and no messaging between players. If you&rsquo;d rather they didn&rsquo;t use it, just ignore this email and the account stays switched off.
        </p>
        <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#4b715b;word-break:break-all;">
          If the button doesn&rsquo;t work, paste this link into your browser:<br />${consentUrl}
        </p>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}

export type GuardianConsentEmail = {
  to: string;
  athleteName: string;
  token: string;
};

/**
 * Send the guardian consent email and return the link plus whether it was
 * actually delivered (false when no mail provider is configured, so callers can
 * decide what to surface). Never throws — the token is already persisted, so a
 * delivery failure is recoverable via resend.
 */
export async function sendGuardianConsentEmail({
  to,
  athleteName,
  token,
}: GuardianConsentEmail): Promise<{ consentUrl: string; delivered: boolean }> {
  const consentUrl = guardianConsentUrl(token);
  const { subject, html, text } = buildGuardianConsentEmail({
    athleteName,
    consentUrl,
  });
  const { delivered } = await sendEmail({ to, subject, html, text });
  return { consentUrl, delivered };
}
