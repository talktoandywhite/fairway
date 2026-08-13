import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TrendDescription } from "@/lib/dashboard/present";

/**
 * The scoring trend as an arrow, a word, and a magnitude — direction from the
 * sign of the engine's trend slope, never re-derived here. It always pairs an
 * icon with a text label so color alone never carries the meaning (DESIGN.md
 * §2): a red arrow could read as an alarm to a colorblind athlete, "Trending
 * up" cannot. A near-flat season reads "Holding steady" in muted text, not a
 * false win. Callers handle the null (too few rounds) case with an empty state.
 */
export function TrendIndicator({ trend }: { trend: TrendDescription }) {
  const perMonth = Math.abs(trend.strokesPerMonth);

  const config = {
    improving: {
      Icon: TrendingDown,
      label: "Improving",
      className: "status-success",
    },
    regressing: {
      Icon: TrendingUp,
      label: "Trending up",
      className: "status-warning",
    },
    steady: {
      Icon: Minus,
      label: "Holding steady",
      className: "text-muted-foreground",
    },
  }[trend.direction];

  const { Icon, label, className } = config;

  return (
    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 font-semibold",
          className,
        )}
      >
        <Icon aria-hidden className="size-4 self-center" />
        {label}
      </span>
      {trend.direction !== "steady" ? (
        <span className="text-sm text-muted-foreground">
          about {perMonth} {perMonth === 1 ? "stroke" : "strokes"} a month
        </span>
      ) : null}
    </span>
  );
}
