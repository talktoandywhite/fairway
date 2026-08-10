"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart as RechartsLineChart,
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
import type { ChartSeries } from "@/components/charts/bar-chart";

export interface FairwayLineChartProps {
  data: Array<Record<string, string | number>>;
  /** Row key for the category (x) axis. */
  categoryKey: string;
  /** Series, assigned to chart slots in array order and never re-slotted. */
  series: ChartSeries[];
  height?: number;
  /** Accessible description of what the chart shows. */
  ariaLabel: string;
}

/**
 * FairwayLineChart — trend lines in the Clubhouse palette (DESIGN.md §3). Same
 * fixed-slot rule and recessive grid/axis as the bar wrapper. One y-axis, never
 * two. This is the shape the dashboard's scoring-average trend uses in Session 9.
 */
export function FairwayLineChart({
  data,
  categoryKey,
  series,
  height = 280,
  ariaLabel,
}: FairwayLineChartProps) {
  const colors = assignSlots(series.length);
  return (
    <div
      className="overflow-hidden"
      style={{ width: "100%", height }}
      role="img"
      aria-label={ariaLabel}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart
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
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={colors[i]}
              strokeWidth={2}
              dot={{ r: 3, fill: colors[i] }}
              activeDot={{ r: 5 }}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}
