import { LineChart } from "lucide-react";

import { DataValue } from "@/components/ui/data-value";
import { EmptyState } from "@/components/ui/empty-state";
import { FairwayLineChart } from "@/components/charts/line-chart";

export interface ScoreTrendPoint {
  /** Short x-axis label, e.g. "Aug 9". */
  label: string;
  /** Full date for the table view, e.g. "Aug 9, 2025". */
  fullDate: string;
  /** The round's score. */
  score: number;
}

export interface ScoreTrendCardProps {
  /** Qualifying rounds oldest-first — the same population as the scoring
   * average. Fewer than two means there is no trend to draw. */
  points: ScoreTrendPoint[];
  /** The goal score, drawn as a dashed reference line; null when no goal. */
  goalTarget: number | null;
}

/**
 * The score trend over time, with the goal as a reference line — the picture of
 * "am I getting there?". Never an empty chart: below two qualifying rounds it
 * shows what to do instead (DESIGN.md §5). A `<details>` table view sits under
 * the chart so the data is reachable without color or a pointer (DESIGN.md §3,
 * "every chart has a table view").
 */
export function ScoreTrendCard({ points, goalTarget }: ScoreTrendCardProps) {
  return (
    <section
      aria-labelledby="trend-heading"
      className="metric-card flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <h2 id="trend-heading" className="text-lg font-semibold">
          Score trend
        </h2>
        <p className="text-sm text-muted-foreground">
          Your 18-hole tournament rounds over time
          {goalTarget !== null ? ", against your goal" : ""}.
        </p>
      </div>

      {points.length < 2 ? (
        <EmptyState
          icon={<LineChart aria-hidden className="size-6" />}
          title="Not enough rounds to chart a trend"
          hint="Log at least two 18-hole tournament rounds and your trend line will appear here."
        />
      ) : (
        <>
          <FairwayLineChart
            data={points.map((p) => ({ label: p.label, score: p.score }))}
            categoryKey="label"
            series={[{ key: "score", label: "Score" }]}
            referenceLines={
              goalTarget !== null
                ? [{ y: goalTarget, label: `Goal ${goalTarget}` }]
                : []
            }
            height={280}
            ariaLabel={
              goalTarget !== null
                ? `Line chart of your tournament scores over time, with a goal line at ${goalTarget}.`
                : "Line chart of your tournament scores over time."
            }
          />

          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground focus-visible:text-foreground">
              View as table
            </summary>
            <div className="mt-2 overflow-x-auto">
              <table className="scorecard-table w-full">
                <caption className="sr-only">
                  Your tournament scores over time
                  {goalTarget !== null ? `, goal ${goalTarget}` : ""}.
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="text-left">
                      Date
                    </th>
                    <th scope="col" className="text-right">
                      Score
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((p) => (
                    <tr key={p.fullDate}>
                      <td>{p.fullDate}</td>
                      <td className="text-right">
                        <DataValue>{p.score}</DataValue>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
