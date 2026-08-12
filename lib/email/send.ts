import { Resend } from "resend";

/**
 * The single outbound-email seam for the app. Every transactional email we send
 * ourselves (starting with guardian consent) goes through here.
 *
 * Delivery is via Resend when `RESEND_API_KEY` is set. When it is not — local
 * dev, CI, the e2e suite — we log the intent instead of sending, so nothing
 * real leaves the machine and tests stay hermetic. Either way this NEVER throws:
 * a failed email must not take down the signup or consent flow that triggered
 * it. Callers get a `delivered` boolean and can decide what to tell the user;
 * the durable artifact (e.g. the consent token) already lives in the database
 * and can be re-sent.
 *
 * Server-only: imported by Server Actions and the auth callback, never by a
 * Client Component, so the API key stays server-side.
 */

export type OutboundEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/**
 * The From address. Resend requires either a verified sending domain or its
 * shared `onboarding@resend.dev` (which only delivers to the Resend account's
 * own address — fine for a first test, not for real guardians). Set `EMAIL_FROM`
 * to a verified-domain sender for production.
 */
function emailFrom(): string {
  return process.env.EMAIL_FROM ?? "Fairway <onboarding@resend.dev>";
}

export async function sendEmail(
  email: OutboundEmail,
): Promise<{ delivered: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.info(
      `[email] RESEND_API_KEY not set — not sending "${email.subject}" to ${email.to}. ` +
        `Set RESEND_API_KEY (and EMAIL_FROM) to enable delivery.`,
    );
    return { delivered: false };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: emailFrom(),
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    if (error) {
      console.error(
        `[email] Resend rejected "${email.subject}" to ${email.to}:`,
        error,
      );
      return { delivered: false };
    }
    return { delivered: true };
  } catch (err) {
    console.error(
      `[email] failed sending "${email.subject}" to ${email.to}:`,
      err,
    );
    return { delivered: false };
  }
}
