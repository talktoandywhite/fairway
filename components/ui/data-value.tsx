import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * DataValue — every score, metric, and table figure in Fairway.
 *
 * Applies the monospace family and `tabular-nums` (via the `.data-value` class
 * in globals.css) so columns align and a live-updating number doesn't jitter as
 * digits change width. Numbers are the point of this product; they get their
 * own component so no figure is ever rendered in the UI sans face by accident.
 */
export type DataValueProps = React.HTMLAttributes<HTMLSpanElement>;

const DataValue = React.forwardRef<HTMLSpanElement, DataValueProps>(
  ({ className, ...props }, ref) => (
    <span ref={ref} className={cn("data-value", className)} {...props} />
  ),
);
DataValue.displayName = "DataValue";

export { DataValue };
