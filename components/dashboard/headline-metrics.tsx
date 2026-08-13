import Link from "next/link";
import { Plus } from "lucide-react";

import { DataValue } from "@/components/ui/data-value";
import { MetricCard, MetricCardPrimary } from "@/components/ui/metric-card";
import { formatPlayedOn } from "@/lib/rounds/format";
import type { TrendDescription } from "@/lib/dashboard/present";
import { TrendIndicator } from "@/components/dashboard/trend-indicator";

export interface HeadlineMetricsProps {
  /** Scoring average from the engine; null when no tournament round qualifies. */
  average: number | null;
  /** Mean of the last three tournament rounds; null with fewer than three. */
  lastThree: number | null;
  /** The goal's target score; null when no goal is set. */
  goalTarget: number | null;
  /** The goal's deadline (`YYYY-MM-DD`), if any. */
  goalDeadline: string | null;
  /** Average minus target from the engine; null when there is no average. */
  strokesToGoal: number | null;
  /** Trend description, or null with fewer than two qualifying rounds. */
  trend: TrendDescription | null;
}

/**
 * Above the fold: the one question the dashboard answers — am I getting there?
 * The scoring average is the single `.metric-card-primary` on the screen; its
 * power is being the only one, so nothing else here competes for it (DESIGN.md
 * §5, CLAUDE.md). Goal, distance to goal, and trend sit beside it as ordinary
 * metric cards. Every value comes from the stats engine; this component only
 * arranges and labels them, and shows an honest empty state when a number is
 * not yet earned.
 */
export function HeadlineMetrics({
  average,
  lastThree,
  goalTarget,
  goalDeadline,
  strokesToGoal,
  trend,
}: HeadlineMetricsProps) {
  return (
    <section aria-labelledby="headline-heading" className="flex flex-col gap-4">
      <h2 id="headline-heading" className="sr-only">
        Am I getting there?
      </h2>

      {average === null ? (
        <MetricCardPrimary
          label="Scoring average"
          value="—"
          hint="Your headline number — the average of your 18-hole tournament rounds — appears here once you log a few."
        >
          <Link
            href="/rounds/new"
            className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary-foreground px-5 text-sm font-semibold text-primary transition-opacity hover:opacity-90"
          >
            <Plus aria-hidden className="size-4" />
            Log a round
          </Link>
        </MetricCardPrimary>
      ) : (
        <MetricCardPrimary
          label="Scoring average"
          value={average}
          hint={
            lastThree !== null ? (
              <>
                Last 3 rounds averaged <DataValue>{lastThree}</DataValue>
              </>
            ) : (
              "Across your 18-hole tournament rounds"
            )
          }
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Goal"
          value={goalTarget ?? "—"}
          hint={
            goalTarget === null
              ? "Set a goal to track your progress"
              : goalDeadline
                ? `by ${formatPlayedOn(goalDeadline)}`
                : "Season target"
          }
        />

        <StrokesToGoalCard
          strokesToGoal={strokesToGoal}
          goalTarget={goalTarget}
        />

        <TrendCard trend={trend} hasAverage={average !== null} />
      </div>
    </section>
  );
}

/**
 * Distance to the goal, framed encouragingly: a positive number is "to go", a
 * met goal reads as met rather than a negative. Null (no average) prompts the
 * next action instead of a zero.
 */
function StrokesToGoalCard({
  strokesToGoal,
  goalTarget,
}: {
  strokesToGoal: number | null;
  goalTarget: number | null;
}) {
  if (strokesToGoal === null || goalTarget === null) {
    return (
      <MetricCard
        label="Strokes to goal"
        value="—"
        hint={
          goalTarget === null
            ? "Set a goal first"
            : "Log tournament rounds to measure"
        }
      />
    );
  }

  if (strokesToGoal <= 0) {
    const under = Math.abs(strokesToGoal);
    return (
      <MetricCard label="Strokes to goal" value="Met">
        <p className="status-success mt-1 text-sm font-medium">
          {under === 0
            ? "Right on your goal"
            : `${under} under your ${goalTarget} goal`}
        </p>
      </MetricCard>
    );
  }

  return (
    <MetricCard
      label="Strokes to goal"
      value={strokesToGoal}
      hint={`to your ${goalTarget} goal`}
    />
  );
}

/** Trend direction as its own card, or an empty prompt below two rounds. */
function TrendCard({
  trend,
  hasAverage,
}: {
  trend: TrendDescription | null;
  hasAverage: boolean;
}) {
  return (
    <div className="metric-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Trend
      </p>
      {trend === null ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {hasAverage
            ? "Log another tournament round to see your trend"
            : "Log at least two tournament rounds to see your trend"}
        </p>
      ) : (
        <div className="mt-2 text-lg">
          <TrendIndicator trend={trend} />
        </div>
      )}
    </div>
  );
}
