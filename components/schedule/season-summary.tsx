import { DataValue } from "@/components/ui/data-value";
import { GAP_LIMIT_DAYS } from "@/lib/dashboard/present";
import { formatFeeCents } from "@/lib/schedule/format";
import type { StatusCounts } from "@/lib/schedule/present";

/**
 * The season summary — the four numbers the workbook's Tournament Plan tab kept
 * in view: how many events are planned, how many are played, what the entry fees
 * add up to, and the longest gap. Every figure is passed in from the engine
 * (`seasonFeeTotal`, `longestGap`) or the plain `statusCounts`; this component
 * derives nothing (Session 8/9 carry-forward: "Every derived number comes from
 * the stats engine — never recomputed"). Money arrives as integer cents and is
 * formatted for display only.
 *
 * The tiles use a compact card surface (tighter than the dashboard `MetricCard`)
 * so a four-figure fee like "$1,234.00" fits two-up at 375px without clipping.
 */
export function SeasonSummary({
  counts,
  feeTotalCents,
  longestGapDays,
}: {
  counts: StatusCounts;
  feeTotalCents: number;
  longestGapDays: number | null;
}) {
  const gapHint =
    longestGapDays === null
      ? "Add a second event to measure it"
      : longestGapDays > GAP_LIMIT_DAYS
        ? `Over the ${GAP_LIMIT_DAYS}-day plan`
        : `Within the ${GAP_LIMIT_DAYS}-day plan`;

  return (
    <section
      aria-label="Season summary"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      <Tile
        label="Planned"
        value={counts.planned}
        hint={
          counts.upcoming > 0
            ? `${counts.upcoming} still ahead`
            : counts.skipped > 0
              ? `${counts.skipped} skipped`
              : "events on the plan"
        }
      />
      <Tile
        label="Played"
        value={counts.played}
        hint={counts.planned > 0 ? `of ${counts.planned} planned` : "so far"}
      />
      <Tile
        label="Entry fees"
        value={formatFeeCents(feeTotalCents)}
        hint="skipped events excluded"
      />
      <Tile
        label="Longest gap"
        value={longestGapDays === null ? "—" : `${longestGapDays}d`}
        hint={gapHint}
      />
    </section>
  );
}

/** A compact metric tile: the card reading surface with a tight p-4 and a
 * text-2xl figure, sized so four fit two-up at 375px (a four-figure fee like
 * "$1,234.00" included). Deliberately not the dashboard `.metric-card`, whose
 * fixed p-6/text-3xl overflow at that width. */
function Tile({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <DataValue className="mt-1 block text-2xl text-foreground">
        {value}
      </DataValue>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}
