"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  assignSlots,
  CHART_AXIS,
  CHART_GRID,
  CHART_REFERENCE,
  CHART_TICK,
} from "@/components/charts/chart-colors";
import type { ChartSeries } from "@/components/charts/bar-chart";

/** A horizontal annotation line — a goal or target — drawn across the plot.
 * It is an annotation, not a data series: it wears the recessive reference
 * token, never a chart slot, so it can never be mistaken for a fifth trend. */
export interface ChartReferenceLine {
  /** Value on the y-axis to draw the line at. */
  y: number;
  /** Short label rendered at the line, e.g. "Goal 100". */
  label: string;
}

export interface FairwayLineChartProps {
  data: Array<Record<string, string | number>>;
  /** Row key for the category (x) axis. */
  categoryKey: string;
  /** Series, assigned to chart slots in array order and never re-slotted. */
  series: ChartSeries[];
  /** Horizontal reference lines (a goal, a target), drawn behind the series. */
  referenceLines?: ChartReferenceLine[];
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
  referenceLines = [],
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
          {referenceLines.map((r) => (
            <ReferenceLine
              key={`ref-${r.y}`}
              y={r.y}
              stroke={CHART_REFERENCE}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              ifOverflow="extendDomain"
              label={{
                value: r.label,
                position: "insideTopRight",
                fill: CHART_TICK,
                fontSize: 11,
              }}
            />
          ))}
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
