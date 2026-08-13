"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { DataValue } from "@/components/ui/data-value";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { formatPlayedOn, toParLabel } from "@/lib/rounds/format";
import {
  ROUND_TYPE_LABELS,
  ROUND_TYPES,
  type RoundType,
} from "@/lib/schemas/round";
import type { RoundRow } from "@/lib/stats";

import { deleteRoundAction } from "@/app/(app)/rounds/actions";
import { DeleteRoundButton } from "./delete-round-button";

/**
 * The Score Log list: newest first (ordered server-side), filterable by type,
 * with an optimistic delete so a removed round vanishes instantly even on a slow
 * connection and reconciles when the server revalidates.
 *
 * Filtering is done in-memory on the already-fetched rows — no round trip — so
 * flipping between "All" and "Tournament" is instant. The rows themselves show
 * only raw fields (date, course, type, score, to-par); the headline derived
 * numbers live above this component and come from the stats engine.
 */

type Filter = RoundType | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  ...ROUND_TYPES.map((t) => ({ value: t, label: ROUND_TYPE_LABELS[t] })),
];

export function RoundList({ rounds }: { rounds: RoundRow[] }) {
  const [filter, setFilter] = React.useState<Filter>("all");
  const [, startTransition] = React.useTransition();

  // Optimistic removal: the deleted row disappears at once; if the action fails,
  // the next server render restores it.
  const [optimisticRounds, removeOptimistic] = React.useOptimistic(
    rounds,
    (state, idToRemove: string) => state.filter((r) => r.id !== idToRemove),
  );

  const handleDelete = (id: string) => {
    startTransition(async () => {
      removeOptimistic(id);
      const fd = new FormData();
      fd.set("id", id);
      await deleteRoundAction(fd);
    });
  };

  const visible =
    filter === "all"
      ? optimisticRounds
      : optimisticRounds.filter((r) => r.round_type === filter);

  // Counts drive the filter chips so a type with nothing in it can be hidden
  // rather than leading to a confusing empty list.
  const countFor = (value: Filter) =>
    value === "all"
      ? optimisticRounds.length
      : optimisticRounds.filter((r) => r.round_type === value).length;

  return (
    <div className="flex flex-col gap-4">
      <div
        role="group"
        aria-label="Filter rounds by type"
        className="flex flex-wrap gap-2"
      >
        {FILTERS.filter((f) => f.value === "all" || countFor(f.value) > 0).map(
          (f) => {
            const selected = filter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                aria-pressed={selected}
                className={cn(
                  "inline-flex h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background text-foreground hover:bg-muted",
                )}
              >
                {f.label}
                <span
                  className={cn(
                    "data-value text-xs",
                    selected
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground",
                  )}
                >
                  {countFor(f.value)}
                </span>
              </button>
            );
          },
        )}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={
            filter === "all"
              ? "No rounds logged yet"
              : `No ${ROUND_TYPE_LABELS[filter as RoundType].toLowerCase()} rounds yet`
          }
          hint={
            filter === "all"
              ? "Log your first round to start tracking your scoring average and where the strokes are going."
              : "Try a different filter, or log one."
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((round) => (
            <li
              key={round.id}
              className="flex items-stretch gap-1 rounded-lg border border-border bg-card"
            >
              <Link
                href={`/rounds/${round.id}`}
                className="flex flex-1 items-center gap-3 rounded-l-lg px-4 py-3 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-medium text-foreground">
                    {round.course}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatPlayedOn(round.played_on)} ·{" "}
                    {ROUND_TYPE_LABELS[round.round_type]} · {round.holes} holes
                  </span>
                </div>
                <div className="flex shrink-0 flex-col items-end">
                  <DataValue className="text-xl leading-none text-foreground">
                    {round.score}
                  </DataValue>
                  <DataValue className="text-sm text-muted-foreground">
                    {toParLabel(round.score, round.par)}
                  </DataValue>
                </div>
                <ChevronRight
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground"
                />
              </Link>
              <div className="flex items-center pr-2">
                <DeleteRoundButton
                  roundId={round.id}
                  courseLabel={`${round.course} on ${formatPlayedOn(round.played_on)}`}
                  onConfirm={() => handleDelete(round.id)}
                  size="sm"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
