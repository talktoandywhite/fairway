import { cn } from "@/lib/utils";
import { PRACTICE_WINDOWS, type PracticeWindow } from "@/lib/practice/present";

/**
 * The rollup window selector. The window is a URL parameter, not client state:
 * the whole page — rollup, ratio check, list — is derived from it on the server,
 * so the choice survives a reload, a share, and the back button, and the control
 * needs no JavaScript to work.
 *
 * These are plain anchors rather than `next/link`, deliberately. The target
 * differs from the current URL only in its query string, and the App Router
 * proved unreliable at that here: measured over repeated runs against a
 * production build, a `<Link>` click dropped silently — no transition, no URL
 * change, no loading state — most of the time, and adding `scroll={false}` made
 * it worse. It is the same class of problem as the same-route re-render noted in
 * the round/schedule work. A document navigation always lands. The cost is a full
 * page load on a window change, which on a server-rendered page of this size is
 * not a cost worth an unreliable control.
 */
export function WindowTabs({ active }: { active: PracticeWindow }) {
  return (
    <nav aria-label="Rollup window" className="flex flex-wrap gap-2">
      {PRACTICE_WINDOWS.map((w) => {
        const selected = w.value === active.value;
        return (
          <a
            key={w.value}
            href={`/practice?window=${w.value}`}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "inline-flex h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background text-foreground hover:bg-muted",
            )}
          >
            {w.label}
          </a>
        );
      })}
    </nav>
  );
}
