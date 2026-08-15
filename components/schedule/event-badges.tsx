import {
  ArrowDown,
  Check,
  CircleDashed,
  CircleDot,
  LifeBuoy,
  MinusCircle,
  Star,
  Target,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  EVENT_PRIORITY_LABELS,
  EVENT_STATUS_LABELS,
  type EventPriority,
  type EventStatus,
} from "@/lib/schemas/event";

/**
 * Status and priority badges for the schedule.
 *
 * Two deliberate design calls (flagged in the session summary):
 *
 *   1. Every badge pairs an ICON with a text LABEL, so meaning never rides on
 *      colour alone — the badges stay legible in greyscale and to a colourblind
 *      reader (DESIGN.md §2, Definition of Done).
 *
 *   2. The reserved status palette (`--success`/`--warning`/`--destructive`) is
 *      kept for genuinely semantic meaning, NOT spent decorating every category.
 *      Only `played` — the good terminal state — earns `--success`. Every other
 *      status and EVERY priority uses neutral tokens differentiated by icon and
 *      label; the single "priority" (must-play) tier gets a brass FILL (a fill,
 *      never brass-as-text — DESIGN.md §2) to lift it without touching the status
 *      palette. `skipped` is de-emphasised, never destructive-red — dropping an
 *      event from the plan is a decision, not a failure (CLAUDE.md, "no red
 *      badges for a missed session").
 *
 * Every colour is a design token; there is not a hex literal in this file.
 */

const CHIP =
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium";

type Tone = {
  icon: LucideIcon;
  className: string;
};

const STATUS_TONES: Record<EventStatus, Tone> = {
  not_registered: {
    icon: CircleDashed,
    className: "border-input bg-transparent text-muted-foreground",
  },
  registered: {
    // Confirmed, but not "done" — a neutral emphasis, not the success colour.
    icon: CircleDot,
    className: "border-input bg-muted text-foreground",
  },
  played: {
    // The good terminal state — the one place the reserved success token earns
    // its keep on this screen.
    icon: Check,
    className: "border-success/30 bg-success/10 text-success",
  },
  skipped: {
    // Off the plan, de-emphasised. Not destructive — skipping isn't a failure.
    icon: MinusCircle,
    className: "border-transparent bg-muted text-muted-foreground",
  },
};

const PRIORITY_TONES: Record<EventPriority, Tone> = {
  priority: {
    // Must-play. Brass FILL for weight, brass-strong border — never brass text.
    icon: Star,
    className: "border-secondary-strong/40 bg-secondary/15 text-foreground",
  },
  optional: {
    icon: CircleDot,
    className: "border-input bg-transparent text-muted-foreground",
  },
  stretch: {
    icon: Target,
    className: "border-input bg-transparent text-muted-foreground",
  },
  backup: {
    icon: LifeBuoy,
    className: "border-input bg-transparent text-muted-foreground",
  },
  low: {
    icon: ArrowDown,
    className: "border-input bg-transparent text-muted-foreground",
  },
};

export function StatusBadge({ status }: { status: EventStatus }) {
  const tone = STATUS_TONES[status];
  const Icon = tone.icon;
  return (
    <span className={cn(CHIP, tone.className)}>
      <Icon aria-hidden className="size-3" />
      {EVENT_STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: EventPriority }) {
  const tone = PRIORITY_TONES[priority];
  const Icon = tone.icon;
  return (
    <span className={cn(CHIP, tone.className)}>
      <Icon aria-hidden className="size-3" />
      {EVENT_PRIORITY_LABELS[priority]}
    </span>
  );
}
