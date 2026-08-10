import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * ScorecardTable — the Clubhouse data table (DESIGN.md §5). Uppercase tracked
 * headers on the sage surface, hairline row borders, monospace right-aligned
 * numerics, subtle row hover. It should read like a physical scorecard.
 *
 * Styling comes from the `.scorecard-table` class in globals.css. Add
 * `className="numeric"` to any `<td>` that holds a figure — it right-aligns and
 * switches to the monospace, tabular family. The table is wrapped in a
 * horizontal-scroll container so a wide scorecard never breaks the 375px layout.
 */
const ScorecardTable = React.forwardRef<
  HTMLTableElement,
  React.TableHTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="w-full overflow-x-auto">
    <table ref={ref} className={cn("scorecard-table", className)} {...props} />
  </div>
));
ScorecardTable.displayName = "ScorecardTable";

export { ScorecardTable };
