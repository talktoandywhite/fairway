"use client";

import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  assignSlots,
  CHART_AXIS,
  CHART_GRID,
  CHART_TICK,
} from "@/components/charts/chart-colors";

export interface ChartSeries {
  /** Key into each data row. */
  key: string;
  /** Human label for legend and tooltip. */
  label: string;
}

export interface FairwayBarChartProps {
  data: Array<Record<string, string | number>>;
  /** Row key for the category (x) axis. */
  categoryKey: string;
  /** Series, assigned to chart slots in array order and never re-slotted. */
  series: ChartSeries[];
  stacked?: boolean;
  height?: number;
  /** Accessible description of what the chart shows. */
  ariaLabel: string;
}

/**
 * FairwayBarChart — bar and stacked-bar in the Clubhouse palette (DESIGN.md §3).
 * Series map to `--chart-1`… in fixed order; grid and axis wear the recessive
 * tokens; ticks wear a text token, never a series color. A legend appears for
 * two or more series. Bar/line/stacked use the standard eight-slot order and are
 * unaffected by the all-pairs triad cap. Pair with a table view per §3.
 */
export function FairwayBarChart({
  data,
  categoryKey,
  series,
  stacked = false,
  height = 280,
  ariaLabel,
}: FairwayBarChartProps) {
  const colors = assignSlots(series.length);
  return (
    <div
      className="overflow-hidden"
      style={{ width: "100%", height }}
      role="img"
      aria-label={ariaLabel}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <CartesianGrid stroke={CHART_GRID} vertical={false} />
          <XAxis
            dataKey={categoryKey}
            stroke={CHART_AXIS}
            tick={{ fill: CHART_TICK, fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            stroke={CHART_AXIS}
            tick={{ fill: CHART_TICK, fontSize: 12 }}
            tickLine={false}
            width={40}
          />
          <Tooltip
            cursor={{ fill: CHART_GRID, opacity: 0.4 }}
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.375rem",
              color: "hsl(var(--popover-foreground))",
              fontSize: 12,
            }}
          />
          {series.length >= 2 ? <Legend /> : null}
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={colors[i]}
              stackId={stacked ? "stack" : undefined}
              radius={stacked ? 0 : [3, 3, 0, 0]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
