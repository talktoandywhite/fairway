import * as React from "react";
import { cn } from "@/lib/utils";
import { DataValue } from "@/components/ui/data-value";

interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Short uppercase label, e.g. "Scoring average". */
  label: string;
  /** The figure. Rendered as a `DataValue` (monospace, tabular). */
  value: React.ReactNode;
  /** Optional supporting line under the value — a trend, a target, a hint. */
  hint?: React.ReactNode;
}

/**
 * MetricCard — a labelled figure on the standard card surface (DESIGN.md §5).
 * Use freely for secondary metrics. For the one headline "Am I getting there?"
 * number, use `MetricCardPrimary` — and only once per screen.
 */
function MetricCard({
  label,
  value,
  hint,
  className,
  children,
  ...props
}: MetricCardProps) {
  return (
    <div className={cn("metric-card", className)} {...props}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <DataValue className="mt-2 block text-3xl text-foreground">
        {value}
      </DataValue>
      {hint ? (
        <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      ) : null}
      {children}
    </div>
  );
}

/**
 * MetricCardPrimary — the reserved "Am I getting there?" card: Fairway Green,
 * white text, gradient. Exactly one per screen. Its power is being the only one,
 * so it does not accept a variant that dilutes it.
 */
function MetricCardPrimary({
  label,
  value,
  hint,
  className,
  children,
  ...props
}: MetricCardProps) {
  return (
    <div className={cn("metric-card-primary", className)} {...props}>
      <p className="text-xs font-semibold uppercase tracking-wide text-primary-foreground/80">
        {label}
      </p>
      <DataValue className="mt-2 block text-4xl text-primary-foreground">
        {value}
      </DataValue>
      {hint ? (
        <p className="mt-1 text-sm text-primary-foreground/80">{hint}</p>
      ) : null}
      {children}
    </div>
  );
}

export { MetricCard, MetricCardPrimary };
