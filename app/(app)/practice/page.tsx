import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Timer } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MinutesRollup } from "@/components/practice/minutes-rollup";
import { PracticeList } from "@/components/practice/practice-list";
import { RatioCheckCard } from "@/components/practice/ratio-check";
import { WindowTabs } from "@/components/practice/window-tabs";
import { getActiveAthleteId } from "@/lib/auth/athlete";
import { todayISO } from "@/lib/dashboard/present";
import {
  buildRollup,
  parseWindow,
  ratioCheck,
  sessionsInWindow,
} from "@/lib/practice/present";
import { getPracticeSessions, getRatioBasisData } from "@/lib/practice/queries";
import { scoringAverage } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";

/**
 * The Practice Log — the session list, the minutes-by-type rollup, and the ratio
 * check, all over one selectable window.
 *
 * The order on the page is deliberate. The mix comes FIRST, because it is the
 * one thing here that changes what an athlete does tomorrow: the workbook's
 * finding is that practice time is usually pointed at the wrong part of the game,
 * and burying that under a list of sessions would be burying the lede. The rollup
 * is the evidence for it, and the log itself is the record underneath.
 *
 * Every derived number comes from the stats engine (`minutesByType` via
 * `buildRollup`, `scoringAverage`) or the pure functions in
 * `lib/practice/present`; this page reads rows and lays out the answers, never
 * recomputing a metric itself (CLAUDE.md, "Calculations").
 */
export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string | string[] }>;
}) {
  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);
  // Parent/coach accounts (no athlete row) have no practice log of their own;
  // the dashboard is where they land. Athlete resolution is server-side, always.
  if (!athleteId) redirect("/dashboard");

  const [{ window: windowParam }, sessions, basis] = await Promise.all([
    searchParams,
    getPracticeSessions(supabase, athleteId),
    getRatioBasisData(supabase, athleteId),
  ]);

  const activeWindow = parseWindow(windowParam);
  const windowed = sessionsInWindow(sessions, todayISO(), activeWindow);
  const rollup = buildRollup(windowed);
  const check = ratioCheck(windowed, {
    // The engine owns the "18-hole tournament rounds only" rule; null here means
    // there is no honest scoring average yet and the band falls back to level.
    scoringAverage: scoringAverage(basis.rounds),
    level: basis.level,
  });

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Practice</h1>
          <p className="text-sm text-muted-foreground">
            Your Practice Log — what you worked on, and whether it&apos;s the
            right work.
          </p>
        </div>
        <Link
          href="/practice/new"
          className={buttonVariants({ variant: "primary" })}
        >
          <Plus aria-hidden />
          Log a session
        </Link>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon={<Timer className="size-6" aria-hidden />}
          title="No practice logged yet"
          hint="Log what you work on and for how long. Once there's a few sessions in here, you'll see where your hours actually go — and whether that's where your strokes are going."
          action={
            <Link
              href="/practice/new"
              className={buttonVariants({ variant: "primary" })}
            >
              Log your first session
            </Link>
          }
        />
      ) : (
        <>
          <WindowTabs active={activeWindow} />

          {rollup.totalMinutes === 0 ? (
            <EmptyState
              icon={<Timer className="size-6" aria-hidden />}
              title={`Nothing logged in the last ${activeWindow.label.toLowerCase()}`}
              hint="Widen the window above to see further back, or log a session to start this one off."
            />
          ) : (
            <>
              {check ? (
                <RatioCheckCard
                  check={check}
                  windowLabel={activeWindow.label}
                />
              ) : null}
              <MinutesRollup
                rows={rollup.loggedRows}
                totalMinutes={rollup.totalMinutes}
                sessionCount={rollup.sessionCount}
                windowLabel={activeWindow.label}
              />
            </>
          )}

          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Sessions</h2>
            <PracticeList
              sessions={windowed}
              windowLabel={activeWindow.label}
            />
          </div>
        </>
      )}
    </section>
  );
}
