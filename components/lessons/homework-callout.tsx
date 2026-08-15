import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HomeworkPrompt } from "@/lib/lessons/present";

import { HomeworkBadge } from "./homework-badge";

/**
 * Outstanding homework, as a callout. One component, two homes: the top of the
 * Lesson Log and the dashboard — the same facts should not be worded two ways,
 * and a second copy would be a second thing to keep true.
 *
 * Which lesson this is comes from the engine (`outstandingHomework` — only the
 * most recent lesson can carry homework, because the next lesson supersedes the
 * last), and the wording comes from `homeworkPrompt`. This component renders; it
 * decides nothing.
 *
 * On colour: this is a neutral surface with a brass FILL behind the icon, not a
 * warning and never Signal Rose. Rose is reserved for gap warnings and
 * exceptional results (DESIGN.md §2), and unfinished homework is neither — it is
 * a thing to go do. A red or amber banner here would be the streak-shaming
 * CLAUDE.md rules out, on the one screen an athlete opens after a bad round.
 */
export function HomeworkCallout({
  prompt,
  className,
}: {
  prompt: HomeworkPrompt;
  className?: string;
}) {
  return (
    <section
      aria-label="Outstanding homework"
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-input bg-card p-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-foreground"
        >
          <ClipboardList className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-foreground">{prompt.title}</h2>
            <HomeworkBadge status={prompt.status} />
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {prompt.sentence}
          </p>
        </div>
      </div>

      <dl className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
        {prompt.drill ? (
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-muted-foreground">Drill</dt>
            <dd className="text-foreground">{prompt.drill}</dd>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-muted-foreground">Target</dt>
          <dd className="text-foreground">{prompt.target}</dd>
        </div>
      </dl>

      <Link
        href={`/lessons/${prompt.lessonId}`}
        className={cn(
          buttonVariants({ variant: "secondary", size: "sm" }),
          "self-start",
        )}
      >
        Open the lesson
      </Link>
    </section>
  );
}
