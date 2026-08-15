import { ArrowUp, Check, Info, Minus } from "lucide-react";

import { DataValue } from "@/components/ui/data-value";
import {
  formatMinutes,
  formatShare,
  formatShareRange,
} from "@/lib/practice/format";
import { SESSION_TYPE_LABELS } from "@/lib/schemas/practice";
import { OUTSIDE_MIX_TYPES } from "@/lib/practice/present";
import type { BucketVerdict, RatioCheck } from "@/lib/practice/present";

/**
 * The ratio check — the one screen in the app that tells an athlete their
 * practice time is going somewhere it will not pay. It is the workbook's central
 * finding made mechanical: a 113 shooter practicing mostly full swing has the
 * ratio backwards, and no amount of range time fixes a scorecard that is losing
 * strokes inside 100 yards.
 *
 * Everything shown here is computed by `ratioCheck` in `lib/practice/present`.
 * The sentence is deterministic — no model is involved anywhere in this
 * component, and every number in the prose is a number rendered on the bars
 * beneath it (pinned by the grounding test in `present.test.ts`).
 *
 * Tone: honest, never scolding (CLAUDE.md design principle #5). A bucket that is
 * short reads "worth more time", never a failure; a bucket over its band is
 * simply "above the range", because over-investing in the short game is not a
 * problem worth a red badge. Every verdict ships as icon + label + color, never
 * color alone (DESIGN.md §2, status colors).
 */
export function RatioCheckCard({
  check,
  windowLabel,
}: {
  check: RatioCheck;
  windowLabel: string;
}) {
  const outsideLabels = OUTSIDE_MIX_TYPES.map(
    (t) => SESSION_TYPE_LABELS[t],
  ).join(" and ");

  return (
    <section
      aria-labelledby="ratio-heading"
      className="flex flex-col gap-5 rounded-lg border border-border bg-card p-4 md:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="ratio-heading" className="text-lg font-semibold">
          Your practice mix
        </h2>
        <p className="text-sm text-muted-foreground">
          How your time splits up, against a healthy mix for where your game is
          — last {windowLabel.toLowerCase()}.
        </p>
      </div>

      {/* The sentence. This is the feature. */}
      <p className="text-base leading-relaxed text-foreground">
        {check.headline}
      </p>

      <ul className="flex flex-col divide-y divide-border">
        {check.buckets.map((bucket) => (
          <li key={bucket.key} className="py-4 first:pt-0 last:pb-0">
            <div className="flex flex-col gap-2">
              {/* Stacked on a phone, side-by-side from `sm`. Deliberately not
                  `flex-wrap`: with wrapping, whether the share lands beside the
                  label or under it depends on how long that bucket's blurb is,
                  so the three rows disagree with each other at 375px. */}
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-x-3">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {bucket.label}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {bucket.blurb}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <DataValue className="text-xl text-foreground">
                    {formatShare(bucket.share)}
                  </DataValue>
                  <span className="text-sm text-muted-foreground">
                    {formatMinutes(bucket.minutes)}
                  </span>
                </div>
              </div>

              <ShareTrack
                label={bucket.label}
                share={bucket.share}
                min={bucket.target.min}
                max={bucket.target.max}
              />

              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <VerdictChip
                  verdict={bucket.verdict}
                  settled={check.hasEnoughData}
                />
                <span className="text-sm text-muted-foreground">
                  Healthy range{" "}
                  <DataValue>
                    {formatShareRange(bucket.target.min, bucket.target.max)}
                  </DataValue>
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Where the benchmark came from, and what isn't in the mix. A benchmark
          you can't see the basis of is just an assertion. */}
      <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
        <p className="flex items-start gap-2">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            {check.basis === "scoring_average" ? (
              <>
                Compared against a healthy mix for {check.band.label}, taken
                from your scoring average of{" "}
                <DataValue>{check.scoringAverage}</DataValue>.
              </>
            ) : (
              <>
                Compared against a healthy mix for {check.band.label}, based on
                your level — log 18-hole tournament rounds and this tunes itself
                to your actual scoring average.
              </>
            )}
          </span>
        </p>
        {check.outsideMinutes > 0 ? (
          <p className="pl-6">
            {outsideLabels} time —{" "}
            <DataValue>{formatMinutes(check.outsideMinutes)}</DataValue> — is in
            the rollup above but not in this mix. Strength work and coaching are
            a separate budget, not a choice about where your practice hours go.
          </p>
        ) : null}
      </div>
    </section>
  );
}

/**
 * One bucket's track: the healthy range as a shaded band, and where the athlete
 * actually is as a marker on top of it. Two separate marks rather than a filled
 * bar, so "you are here" and "the range is there" stay readable when they
 * overlap. The band wears brass (`--secondary`), the palette's annotation role —
 * a target is not a data series and never takes a chart slot.
 */
function ShareTrack({
  label,
  share,
  min,
  max,
}: {
  label: string;
  share: number;
  min: number;
  max: number;
}) {
  const pct = (v: number) => `${Math.min(100, Math.max(0, v * 100))}%`;

  return (
    <div
      role="img"
      aria-label={`${label}: ${formatShare(share)} of your practice mix, against a healthy range of ${formatShareRange(min, max)}.`}
      className="relative h-3 w-full rounded-full bg-muted"
    >
      {/* The healthy range. */}
      <div
        className="absolute inset-y-0 rounded-sm bg-secondary/30 ring-1 ring-inset ring-secondary-strong/60"
        style={{ left: pct(min), width: pct(max - min) }}
      />
      {/* Where the athlete is. Centred on its position and standing slightly
          proud of the track, so 0% and 100% both stay visible instead of
          disappearing into an edge. */}
      <div
        className="absolute -inset-y-1 w-1 -translate-x-1/2 rounded-full bg-foreground"
        style={{ left: pct(share) }}
      />
    </div>
  );
}

/**
 * The verdict, as icon + label + color. `settled` is false when the window holds
 * too little practice to read a mix honestly — the bars still show, but the
 * verdict says "too early to call" rather than passing judgement on 40 minutes.
 */
function VerdictChip({
  verdict,
  settled,
}: {
  verdict: BucketVerdict;
  settled: boolean;
}) {
  if (!settled) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <Minus aria-hidden className="size-4" />
        Too early to call
      </span>
    );
  }

  if (verdict === "in_range") {
    return (
      <span className="status-success inline-flex items-center gap-1.5 text-sm font-semibold">
        <Check aria-hidden className="size-4" />
        In range
      </span>
    );
  }

  if (verdict === "below") {
    return (
      <span className="status-warning inline-flex items-center gap-1.5 text-sm font-semibold">
        <ArrowUp aria-hidden className="size-4" />
        Worth more time
      </span>
    );
  }

  // Above the range is not a problem — it is a lean, and often a good one. It
  // gets a neutral chip, never an alarm.
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
      <Check aria-hidden className="size-4" />
      Above the range
    </span>
  );
}
