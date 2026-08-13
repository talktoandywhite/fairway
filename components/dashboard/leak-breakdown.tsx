import { Check, Droplets } from "lucide-react";

import { DataValue } from "@/components/ui/data-value";
import { EmptyState } from "@/components/ui/empty-state";

export interface LeakView {
  id: string;
  name: string;
  /** The per-round target for this leak (lower is better). */
  target: number;
  /** True when a round detail column measures this leak directly. */
  measured: boolean;
  /** Live per-round average from the engine; null when unmeasured, or measured
   * but not yet recorded on any round. */
  current: number | null;
  /** Fraction closed from the starting high toward target, [0,1]; null when
   * there is nothing measured to place on the track. */
  progress: number | null;
  /** The athlete's self-reported starting range, shown for unmeasured leaks. */
  low: number;
  high: number;
}

/**
 * The leak breakdown — where the strokes actually go, each leak's live per-round
 * average against its target. This is the chart that proves the plan is working:
 * penalties and three-putts closing round over round. Leaks with a real round
 * column show the measured average and a progress track; leaks with no honest
 * column (chipping, hero shots) show the athlete's own starting range instead of
 * a fabricated number, plainly labelled. Tone stays encouraging — a leak not yet
 * at target reads "to go", never a red alarm (CLAUDE.md, DESIGN.md §2).
 */
export function LeakBreakdown({ leaks }: { leaks: LeakView[] }) {
  return (
    <section
      aria-labelledby="leaks-heading"
      className="metric-card flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <h2 id="leaks-heading" className="text-lg font-semibold">
          Leak breakdown
        </h2>
        <p className="text-sm text-muted-foreground">
          Where your strokes go — each leak against its target.
        </p>
      </div>

      {leaks.length === 0 ? (
        <EmptyState
          icon={<Droplets aria-hidden className="size-6" />}
          title="No leaks named yet"
          hint="Name what's costing you strokes — penalties, three-putts, chips — in your goal settings, and watch them close here."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {leaks.map((leak) => (
            <li key={leak.id} className="py-3 first:pt-0 last:pb-0">
              <LeakRow leak={leak} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LeakRow({ leak }: { leak: LeakView }) {
  const met =
    leak.measured && leak.current !== null && leak.current <= leak.target;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{leak.name}</span>
        {met ? (
          <span className="status-success inline-flex items-center gap-1 text-sm font-semibold">
            <Check aria-hidden className="size-4" />
            On target
          </span>
        ) : null}
      </div>

      {leak.measured ? (
        <MeasuredLeak leak={leak} met={met} />
      ) : (
        <UnmeasuredLeak leak={leak} />
      )}
    </div>
  );
}

function MeasuredLeak({ leak, met }: { leak: LeakView; met: boolean }) {
  if (leak.current === null) {
    return (
      <p className="text-sm text-muted-foreground">
        Log this stat on your rounds to start measuring it. Target{" "}
        <DataValue>{leak.target}</DataValue> per round.
      </p>
    );
  }

  const toGo = Math.round((leak.current - leak.target) * 100) / 100;
  const pct = Math.round((leak.progress ?? 0) * 100);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
        <span>
          <DataValue className="text-lg text-foreground">
            {leak.current}
          </DataValue>{" "}
          per round
        </span>
        <span aria-hidden>·</span>
        <span>
          target <DataValue>{leak.target}</DataValue>
        </span>
        {!met ? (
          <>
            <span aria-hidden>·</span>
            <span>
              <DataValue>{toGo}</DataValue> to go
            </span>
          </>
        ) : null}
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`${leak.name}: ${pct}% of the way from your starting range to target`}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function UnmeasuredLeak({ leak }: { leak: LeakView }) {
  return (
    <p className="text-sm text-muted-foreground">
      Tracked by feel — no per-round stat for this yet. You put it at{" "}
      <DataValue>
        {leak.low}–{leak.high}
      </DataValue>{" "}
      a round to start; target <DataValue>{leak.target}</DataValue>.
    </p>
  );
}
