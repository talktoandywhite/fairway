import Link from "next/link";

import { FormAlert } from "../_components/form-alert";
import { ConsentForm } from "./consent-form";

/**
 * Guardian consent landing page. Reached from the emailed link, by a guardian
 * who may not have (and does not need) a Fairway account — the token in the URL
 * is the authorization. A missing token is a dead link, handled explicitly
 * rather than rendering a button that can't work.
 */
export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Consent for a young golfer
        </h1>
        <p className="text-sm text-muted-foreground">
          A player asked to use Fairway and listed you as their parent or
          guardian. Their account stays switched off until you say it&apos;s OK.
        </p>
      </div>

      {token ? (
        <ConsentForm token={token} />
      ) : (
        <FormAlert tone="error">
          This consent link is missing its token. Please open the most recent
          link from your email.
        </FormAlert>
      )}

      <p className="text-sm text-muted-foreground">
        <Link
          href="/"
          className="font-medium text-secondary-strong underline-offset-4 hover:underline"
        >
          Learn more about Fairway
        </Link>
      </p>
    </section>
  );
}
