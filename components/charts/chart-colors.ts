/**
 * The chart palette, as CSS-variable references (DESIGN.md §3).
 *
 * Eight categorical slots in FIXED ORDER. Assign in sequence, never cycle, never
 * reorder — the ordering is the colorblind-safety mechanism, not a style choice.
 * A filter that changes which series appear must not repaint the survivors, so
 * always map a stable series identity to a stable slot index.
 *
 * Values resolve from `--chart-1`…`--chart-8` in globals.css, which are
 * mode-aware and validated by `pnpm test:palette`. Referencing the variables
 * (rather than hardcoding hex) is what keeps light/dark correct for free.
 */
export const CHART_SLOTS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
  "hsl(var(--chart-8))",
] as const;

/** Recessive grid and axis tokens. Grid and axis lines are never a series color. */
export const CHART_GRID = "hsl(var(--chart-grid))";
export const CHART_AXIS = "hsl(var(--chart-axis))";

/** Text tokens for values, ticks, and labels — never the series color. */
export const CHART_TICK = "hsl(var(--muted-foreground))";

/**
 * Annotation / reference lines — a goal or target drawn across the plot. Brass
 * at full strength (`--secondary-strong`, the same rule the AI note uses), so it
 * reads as an annotation and is never confused with a data series. A reference
 * line is not a series, so it does not take a chart slot.
 */
export const CHART_REFERENCE = "hsl(var(--secondary-strong))";

/**
 * The validated triad for all-pairs forms — scatter, bubble, small-multiples —
 * where any two marks can sit side by side. The eight-slot order does not clear
 * that harder test (green and terracotta collapse under protanopia), so those
 * forms use at most these three: cyan (slot 2), rose (slot 7), brass (slot 8).
 * Facet instead of exceeding three.
 */
export const SCATTER_TRIAD = [
  CHART_SLOTS[1],
  CHART_SLOTS[6],
  CHART_SLOTS[7],
] as const;

/**
 * Return the first `count` slots in fixed order. Throws past eight rather than
 * cycling — a ninth category silently reusing slot 1 is a correctness bug, not a
 * cosmetic one. Redesign the chart (group, facet, or "other") instead.
 */
export function assignSlots(count: number): string[] {
  if (count > CHART_SLOTS.length) {
    throw new Error(
      `Chart requested ${count} categorical slots; only ${CHART_SLOTS.length} exist and they are never cycled. Group, facet, or bucket into "other" (DESIGN.md §3).`,
    );
  }
  return CHART_SLOTS.slice(0, count);
}
