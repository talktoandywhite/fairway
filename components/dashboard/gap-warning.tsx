import { AlertTriangle } from "lucide-react";

import { GAP_LIMIT_DAYS } from "@/lib/dashboard/present";

export interface GapWarningProps {
  /** The longest gap in days between consecutive planned events, from the
   * engine; null when there are fewer than two planned events. */
  longestGapDays: number | null;
}

/**
 * The gap warning — the workbook's one hard scheduling rule: never leave more
 * than 60 days between events. It renders only when that line is crossed, so it
 * is a conditional banner, not a widget with an empty state. It ships an icon
 * and a text label, never color alone (DESIGN.md §2), and states the rule plainly
 * without shaming — a long off-season is a fact to plan around, not a failure.
 */
export function GapWarning({ longestGapDays }: GapWarningProps) {
  if (longestGapDays === null || longestGapDays <= GAP_LIMIT_DAYS) return null;

  return (
    <div className="gap-warning" role="status">
      <AlertTriangle aria-hidden className="size-4 shrink-0" />
      <span>
        Your longest gap between events is {longestGapDays} days — the plan is
        to keep it under {GAP_LIMIT_DAYS}. Consider adding an event to bridge
        it.
      </span>
    </div>
  );
}
