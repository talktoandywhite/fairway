"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  CHART_AXIS,
  CHART_GRID,
  CHART_SLOTS,
  CHART_TICK,
} from "@/components/charts/chart-colors";
import { DataValue } from "@/components/ui/data-value";
import { formatMinutes, formatShare } from "@/lib/practice/format";
import type { RollupRow } from "@/lib/practice/present";

/**
 * Minutes by type — where the practice hours actually went in the selected
 * window.
 *
 * The bars are horizontal because there are seven categories with word labels:
 * on a 375px screen those labels are legible down the y-axis and unreadable
 * across the x-axis. Each category takes its FIXED chart slot — the type's
 * position in `SESSION_TYPES` — so changing the window, which changes which
 * types appear, never repaints a surviving category (DESIGN.md §3: "Practice-mix
 * charts have seven categories, which is exactly why the eight slots exist").
 * That is why the fill comes from a per-bar `Cell` keyed on `row.slot` rather
 * than from series order.
 *
 * The table below the chart is the required table view for every chart
 * (DESIGN.md §3) and is what a screen reader reads: the chart itself is a
 * labelled `img`, the table carries the numbers.
 */
export function MinutesRollup({
  rows,
  totalMinutes,
  sessionCount,
  windowLabel,
}: {
  /** Only the types with time on them, biggest first (`Rollup.loggedRows`). */
  rows: RollupRow[];
  totalMinutes: number;
  /** Day blocks in the window — not segments. A four-discipline afternoon is one
   * session here, which is what "over 12 sessions" should mean to an athlete. */
  sessionCount: number;
  /** e.g. "30 days" — names the window in the caption and the chart's label. */
  windowLabel: string;
}) {
  // ~38px a bar keeps the labels clear of one another at every row count.
  const height = Math.max(140, rows.length * 38 + 24);

  return (
    <section
      aria-labelledby="rollup-heading"
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 md:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div className="flex flex-col gap-1">
          <h2 id="rollup-heading" className="text-lg font-semibold">
            Minutes by type
          </h2>
          <p className="text-sm text-muted-foreground">
            Where your practice time went — last {windowLabel.toLowerCase()}.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          <DataValue className="text-2xl text-foreground">
            {formatMinutes(totalMinutes)}
          </DataValue>{" "}
          over {sessionCount} {sessionCount === 1 ? "session" : "sessions"}
        </p>
      </div>

      <div
        style={{ width: "100%", height }}
        role="img"
        aria-label={`Practice minutes by session type over the last ${windowLabel.toLowerCase()}. The table below has the same figures.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 12, bottom: 4, left: 0 }}
          >
            <CartesianGrid stroke={CHART_GRID} horizontal={false} />
            <XAxis
              type="number"
              stroke={CHART_AXIS}
              tick={{ fill: CHART_TICK, fontSize: 12 }}
              tickLine={false}
              tickFormatter={(v: number) => `${v}m`}
            />
            <YAxis
              type="category"
              dataKey="label"
              stroke={CHART_AXIS}
              tick={{ fill: CHART_TICK, fontSize: 12 }}
              tickLine={false}
              width={84}
            />
            <Tooltip
              cursor={{ fill: CHART_GRID, opacity: 0.4 }}
              formatter={(value) => [formatMinutes(Number(value)), "Minutes"]}
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.375rem",
                color: "hsl(var(--popover-foreground))",
                fontSize: 12,
              }}
            />
            <Bar dataKey="minutes" radius={[0, 3, 3, 0]} barSize={22}>
              {rows.map((row) => (
                <Cell key={row.type} fill={CHART_SLOTS[row.slot]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <details className="group">
        <summary className="flex h-11 w-fit cursor-pointer items-center rounded-md px-1 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          View as table
        </summary>
        <table className="mt-2 w-full text-sm">
          <caption className="sr-only">
            Practice minutes by session type over the last{" "}
            {windowLabel.toLowerCase()}
          </caption>
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th scope="col" className="py-2 font-medium">
                Type
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Time
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Share
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.type}
                className="border-b border-border last:border-0"
              >
                <th scope="row" className="py-2 font-normal text-foreground">
                  {row.label}
                </th>
                <td className="py-2 text-right">
                  <DataValue className="text-foreground">
                    {formatMinutes(row.minutes)}
                  </DataValue>
                </td>
                <td className="py-2 text-right">
                  <DataValue className="text-muted-foreground">
                    {formatShare(row.share)}
                  </DataValue>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
