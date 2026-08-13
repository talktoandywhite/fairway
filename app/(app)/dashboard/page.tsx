import { GapWarning } from "@/components/dashboard/gap-warning";
import { HeadlineMetrics } from "@/components/dashboard/headline-metrics";
import {
  LeakBreakdown,
  type LeakView,
} from "@/components/dashboard/leak-breakdown";
import { NextEventCard } from "@/components/dashboard/next-event-card";
import { PhaseCard } from "@/components/dashboard/phase-card";
import {
  ScoreTrendCard,
  type ScoreTrendPoint,
} from "@/components/dashboard/score-trend-card";
import { getActiveAthleteId } from "@/lib/auth/athlete";
import { getDashboardData } from "@/lib/dashboard/queries";
import {
  describeTrend,
  leakProgress,
  resolveLeakField,
  todayISO,
} from "@/lib/dashboard/present";
import { formatPlayedOn } from "@/lib/rounds/format";
import {
  averagePerRound,
  lastNAverage,
  longestGap,
  qualifyingRounds,
  scoringAverage,
  strokesToGoal,
  trendline,
} from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";

/**
 * The dashboard — the "am I getting there?" screen and the post-login landing
 * page (middleware routes signed-in athletes here). Every number on it comes
 * from the stats engine (`lib/stats`); this page reads rows, hands them to the
 * engine and to `lib/dashboard/present`, and lays the answers out. It never
 * recomputes a metric itself (CLAUDE.md, "Calculations"). Each widget carries
 * its own empty state, so a brand-new athlete with zero rounds sees a screen of
 * next steps, never a wall of zeros or a blank chart.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const athleteId = await getActiveAthleteId(supabase);

  // A signed-in user with no athlete row is a parent/coach or an account still
  // mid-onboarding — the multi-athlete experience is V1 (Session 17). For now,
  // there is no single athlete to report on, said plainly.
  if (!athleteId) {
    return (
      <section className="mx-auto flex max-w-lg flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          There&apos;s no athlete profile linked to this account yet. Once an
          athlete profile is set up, your scoring average, trend, and plan will
          live here.
        </p>
      </section>
    );
  }

  const { goal, leaks, phases, events, rounds } = await getDashboardData(
    supabase,
    athleteId,
  );
  const today = todayISO();

  // Headline numbers — all from the engine.
  const average = scoringAverage(rounds);
  const lastThree = lastNAverage(rounds, 3);
  const goalTarget = goal ? Number(goal.target_value) : null;
  const strokes =
    goalTarget !== null ? strokesToGoal(average, goalTarget) : null;
  const trend = describeTrend(trendline(rounds));
  const longestGapDays = longestGap(events);

  // The trend chart draws the SAME qualifying population as the average
  // (engine-owned predicate), oldest-first — the query returns rounds ascending.
  const trendPoints: ScoreTrendPoint[] = qualifyingRounds(rounds).map((r) => ({
    label: shortLabel(r.played_on),
    fullDate: formatPlayedOn(r.played_on),
    score: r.score,
  }));

  // Each leak's live measure against its target. Penalties and three-putts have
  // a real round column; the rest fall back to the athlete's self-reported range
  // rather than a fabricated average (see resolveLeakField).
  const leakViews: LeakView[] = leaks.map((leak) => {
    const field = resolveLeakField(leak.name);
    const target = Number(leak.target_value);
    const high = Number(leak.current_high);
    const low = Number(leak.current_low);
    if (!field) {
      return {
        id: leak.id,
        name: leak.name,
        target,
        measured: false,
        current: null,
        progress: null,
        low,
        high,
      };
    }
    const current = averagePerRound(rounds, field);
    return {
      id: leak.id,
      name: leak.name,
      target,
      measured: true,
      current,
      progress: current !== null ? leakProgress(high, target, current) : null,
      low,
      high,
    };
  });

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Am I getting there? Here&apos;s the honest answer.
        </p>
      </header>

      <HeadlineMetrics
        average={average}
        lastThree={lastThree}
        goalTarget={goalTarget}
        goalDeadline={goal?.deadline ?? null}
        strokesToGoal={strokes}
        trend={trend}
      />

      <ScoreTrendCard points={trendPoints} goalTarget={goalTarget} />

      <LeakBreakdown leaks={leakViews} />

      <GapWarning longestGapDays={longestGapDays} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PhaseCard phases={phases} today={today} />
        <NextEventCard events={events} today={today} />
      </div>
    </div>
  );
}

/** A compact x-axis label like "Aug 9" — full dates live in the table view. */
function shortLabel(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}
