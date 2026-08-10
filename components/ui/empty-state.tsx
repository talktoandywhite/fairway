import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** What is empty, e.g. "No tournament rounds yet". */
  title: string;
  /** What to do to fill it — the whole point of the empty state. */
  hint?: React.ReactNode;
  /** Optional icon (lucide), rendered above the title. */
  icon?: React.ReactNode;
  /** Optional action, e.g. a "Log a round" button. */
  action?: React.ReactNode;
}

/**
 * EmptyState — never a blank chart, never a zero standing in for no data
 * (DESIGN.md §5). A dashed `--input` frame, a title, and a hint that says what
 * to do to fill it. The dashed frame uses `--input` (not `--border`) because it
 * bounds an actionable region and must clear the 3:1 control minimum.
 */
function EmptyState({
  title,
  hint,
  icon,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div className={cn("empty-state", className)} {...props}>
      {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      <p className="empty-state__title">{title}</p>
      {hint ? <p className="empty-state__hint">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export { EmptyState };
