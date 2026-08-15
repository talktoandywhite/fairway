import { DataValue } from "@/components/ui/data-value";
import { cn } from "@/lib/utils";
import { formatCentsTotal } from "@/lib/lessons/format";
import { formatPlayedOn } from "@/lib/rounds/format";

/**
 * The Lesson Log's summary — how many lessons, what they have cost, and when the
 * last one was. Every figure is passed in from the engine (`lessonSpendCents`) or
 * read straight off a row; this component derives nothing (Session 8/9/10
 * carry-forward: "Every derived number comes from the stats engine — never
 * recomputed"). Money arrives as integer cents and is formatted for display only.
 *
 * Spend is here because it is a real fact a parent needs and nowhere else in the
 * app records it. It is stated, never judged — there is no target, no budget bar,
 * and no comparison. The tile layout matches the schedule's season summary so the
 * two cost surfaces in the app read the same way.
 */
export function LessonSummary({
  lessonCount,
  spendCents,
  lastLessonOn,
}: {
  lessonCount: number;
  spendCents: number;
  /** The most recent lesson's `YYYY-MM-DD`, or null with no lessons logged. */
  lastLessonOn: string | null;
}) {
  return (
    <section
      aria-label="Lesson summary"
      className="grid grid-cols-2 gap-3 lg:grid-cols-3"
    >
      <Tile
        label="Lessons"
        value={lessonCount}
        hint={lessonCount === 1 ? "logged" : "logged so far"}
      />
      <Tile
        label="Spent"
        value={formatCentsTotal(spendCents)}
        hint="lessons with a recorded cost"
      />
      <Tile
        label="Last lesson"
        value={lastLessonOn === null ? "—" : formatPlayedOn(lastLessonOn)}
        hint={lastLessonOn === null ? "none logged yet" : "most recent"}
        className="col-span-2 lg:col-span-1"
      />
    </section>
  );
}

/** A compact metric tile — the card reading surface at a tight p-4, sized so the
 * set fits two-up at 375px. Deliberately not the dashboard `.metric-card`, whose
 * fixed p-6/text-3xl overflow at that width. */
function Tile({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint: string;
  className?: string;
}) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-card p-4", className)}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <DataValue className="mt-1 block text-2xl text-foreground">
        {value}
      </DataValue>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}
