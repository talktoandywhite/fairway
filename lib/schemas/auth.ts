import { z } from "zod";

/**
 * Auth + guardian-consent schemas, shared verbatim by the client forms and the
 * server actions (CLAUDE.md: "Zod schemas are shared between client validation
 * and server actions"). The server actions re-parse with these on every call —
 * the client is never trusted, even though RLS is also protecting the data.
 */

/**
 * COPPA's line: a user strictly under 13 needs verifiable parental consent
 * before any personal data is stored. The same constant drives the client
 * (whether to reveal the guardian-email field) and the server (whether to
 * require it). The database enforces the gate independently in 0004_consent.sql
 * — this is UX and input validation, not the security boundary.
 */
export const COPPA_AGE = 13;

/**
 * Parse a `YYYY-MM-DD` calendar date into a Date at UTC noon. Noon avoids the
 * class of off-by-one-day bugs where a midnight UTC date rolls back a day in a
 * negative-offset timezone. A birth date is a calendar day, not an instant
 * (CLAUDE.md), so we only ever compare the y/m/d.
 */
function parseCalendarDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  // Reject impossible dates that Date would silently roll over (e.g. 2011-02-30).
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

/**
 * Whole years from `dob` to `asOf`, birthday-aware. Returns null for an
 * unparseable date so callers can treat "unknown age" as its own case.
 */
export function ageInYears(
  dob: string,
  asOf: Date = new Date(),
): number | null {
  const birth = parseCalendarDate(dob);
  if (!birth) return null;
  let age = asOf.getUTCFullYear() - birth.getUTCFullYear();
  const monthDelta = asOf.getUTCMonth() - birth.getUTCMonth();
  if (
    monthDelta < 0 ||
    (monthDelta === 0 && asOf.getUTCDate() < birth.getUTCDate())
  ) {
    age -= 1;
  }
  return age;
}

/**
 * True only when we can confirm the athlete is under 13. An unparseable date is
 * NOT treated as under-13 here (the schema rejects it before this matters); the
 * database's fail-safe handles unknown ages by freezing the account.
 */
export function isUnderCoppaAge(dob: string, asOf: Date = new Date()): boolean {
  const age = ageInYears(dob, asOf);
  return age !== null && age < COPPA_AGE;
}

const email = z
  .string()
  .trim()
  .min(1, "Enter your email")
  .email("Enter a valid email");

// Supabase local rejects passwords shorter than 6; we ask for 8 so the rule is
// the same in every environment and a little stronger than the floor.
const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use 72 characters or fewer"); // bcrypt truncates beyond 72 bytes

const displayName = z
  .string()
  .trim()
  .min(1, "Enter a name")
  .max(80, "Keep it under 80 characters");

const guardianEmail = z
  .string()
  .trim()
  .min(1, "Enter a parent or guardian email")
  .email("Enter a valid email");

const dateOfBirth = z
  .string()
  .min(1, "Enter a date of birth")
  .refine((v) => parseCalendarDate(v) !== null, "Enter a valid date")
  .refine((v) => {
    const d = parseCalendarDate(v);
    return d !== null && d.getTime() <= Date.now();
  }, "Date of birth can't be in the future")
  .refine((v) => {
    const age = ageInYears(v);
    return age !== null && age <= 100;
  }, "Enter a valid date of birth");

/**
 * Sign-up. Guardian email is required exactly when the athlete is under 13 —
 * the account will be frozen until that guardian consents, so collecting the
 * address up front is the difference between a usable holding screen and a dead
 * end. The `superRefine` attaches the error to the guardianEmail field so the
 * form can surface it inline.
 */
export const signUpSchema = z
  .object({
    displayName,
    email,
    password,
    dateOfBirth,
    guardianEmail: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (isUnderCoppaAge(data.dateOfBirth)) {
      const parsed = guardianEmail.safeParse(data.guardianEmail);
      if (!parsed.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["guardianEmail"],
          message:
            parsed.error.issues[0]?.message ??
            "Enter a parent or guardian email",
        });
      }
    }
  });

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});

export const magicLinkSchema = z.object({ email });

export const resetRequestSchema = z.object({ email });

export const updatePasswordSchema = z
  .object({
    password,
    confirmPassword: z.string().min(1, "Re-enter your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  });

export const guardianEmailSchema = z.object({ guardianEmail });

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type MagicLinkInput = z.infer<typeof magicLinkSchema>;
export type ResetRequestInput = z.infer<typeof resetRequestSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
export type GuardianEmailInput = z.infer<typeof guardianEmailSchema>;
