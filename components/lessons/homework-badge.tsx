import {
  Check,
  CircleDashed,
  CircleHelp,
  CircleSlash2,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { homeworkStatusLabel } from "@/lib/lessons/present";
import type { HomeworkStatus } from "@/lib/schemas/lesson";

/**
 * The homework badge — whether the work a coach assigned actually got done.
 *
 * Two design calls carried over from the schedule's badges (Session 10):
 *
 *   1. Every badge pairs an ICON with a text LABEL, so meaning never rides on
 *      colour alone (DESIGN.md §2, Definition of Done).
 *
 *   2. The reserved status palette is spent only where it is genuinely semantic.
 *      `yes` — the good terminal state — earns `--success`. Nothing here is ever
 *      destructive-red: homework that hasn't happened yet is a thing to go do, and
 *      a red badge for it is exactly the streak-shaming CLAUDE.md rules out. The
 *      remaining states are differentiated by icon and label on neutral tokens.
 *
 * `null` is a real, separate state — the athlete hasn't answered — and it reads
 * as a question, not as a failure.
 *
 * Every colour is a design token; there is not a hex literal in this file.
 */

const CHIP =
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium";

type Tone = { icon: LucideIcon; className: string };

const TONES: Record<HomeworkStatus | "unanswered", Tone> = {
  yes: {
    icon: Check,
    className: "border-success/30 bg-success/10 text-success",
  },
  partly: {
    // Real progress, but not finished — neutral emphasis, not the success colour.
    icon: CircleSlash2,
    className: "border-input bg-muted text-foreground",
  },
  no: {
    // Not yet. De-emphasised on purpose, never destructive.
    icon: CircleDashed,
    className: "border-input bg-transparent text-muted-foreground",
  },
  unanswered: {
    // An open question, which is what it is.
    icon: CircleHelp,
    className:
      "border-dashed border-input bg-transparent text-muted-foreground",
  },
};

export function HomeworkBadge({
  status,
  className,
}: {
  status: HomeworkStatus | null;
  className?: string;
}) {
  const tone = TONES[status ?? "unanswered"];
  const Icon = tone.icon;
  return (
    <span className={cn(CHIP, tone.className, className)}>
      <Icon aria-hidden className="size-3" />
      {homeworkStatusLabel(status)}
    </span>
  );
}
