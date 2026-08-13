import { CalendarRange } from "lucide-react";

import { DataValue } from "@/components/ui/data-value";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPlayedOn } from "@/lib/rounds/format";
import {
  currentPhase,
  daysUntil,
  upcomingPhase,
} from "@/lib/dashboard/present";
import type { Database } from "@/types/database";

type PhaseRow = Database["public"]["Tables"]["phases"]["Row"];

export interface PhaseCardProps {
  phases: PhaseRow[];
  /** Today, `YYYY-MM-DD`. */
  today: string;
}

/**
 * The current training phase — its main job, score target, and how long is
 * left in it. When today falls between phases or after the plan ends (the seed
 * plan runs fall 2025 → spring 2026), there is no current phase, and this says
 * so honestly and points at the next block rather than faking a countdown.
 */
export function PhaseCard({ phases, today }: PhaseCardProps) {
  const active = currentPhase(phases, today);
  const upcoming = active ? null : upcomingPhase(phases, today);

  return (
    <section
      aria-labelledby="phase-heading"
      className="metric-card flex flex-col gap-3"
    >
      <div className="flex items-center gap-2">
        <CalendarRange aria-hidden className="size-4 text-muted-foreground" />
        <h2 id="phase-heading" className="text-lg font-semibold">
          Training phase
        </h2>
      </div>

      {active ? (
        <ActivePhase phase={active} today={today} />
      ) : upcoming ? (
        <UpcomingPhase phase={upcoming} today={today} />
      ) : phases.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Your season plan has wrapped. Add your next phase to set a fresh focus
          and score target.
        </p>
      ) : (
        <EmptyState
          title="No training phases yet"
          hint="Break your year into phases — each with a focus and a score target — to see where you are in the plan."
        />
      )}
    </section>
  );
}

function ActivePhase({ phase, today }: { phase: PhaseRow; today: string }) {
  const daysLeft = daysUntil(today, phase.ends_on);
  const remaining =
    daysLeft <= 0
      ? "Last day of this phase"
      : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} remaining`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold text-foreground">{phase.name}</span>
        <span className="text-sm text-muted-foreground">{remaining}</span>
      </div>
      {phase.main_job ? (
        <p className="text-sm text-muted-foreground">{phase.main_job}</p>
      ) : null}
      {phase.score_target !== null ? (
        <p className="text-sm text-muted-foreground">
          Score target for this phase:{" "}
          <DataValue className="text-foreground">
            {phase.score_target}
          </DataValue>
        </p>
      ) : null}
    </div>
  );
}

function UpcomingPhase({ phase, today }: { phase: PhaseRow; today: string }) {
  const daysAway = daysUntil(today, phase.starts_on);
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm text-muted-foreground">
        You&apos;re between phases right now.
      </p>
      <p className="text-sm text-muted-foreground">
        Next up:{" "}
        <span className="font-medium text-foreground">{phase.name}</span> starts{" "}
        {formatPlayedOn(phase.starts_on)}
        {daysAway > 0
          ? ` — in ${daysAway} ${daysAway === 1 ? "day" : "days"}`
          : ""}
        .
      </p>
    </div>
  );
}
