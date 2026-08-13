import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Select — a native `<select>` on the Clubhouse surface. Native on purpose: it
 * gives the OS picker (a big, thumb-friendly wheel on a phone — the parking-lot
 * case) for free, and it is keyboard- and screen-reader-correct without any JS.
 *
 * The boundary is `--input`, not `--border`: it is a control a person operates,
 * so it uses the 3:1 control-boundary token (DESIGN.md). Matches `Input`'s 44px
 * height and focus ring. The chevron is decorative and non-interactive.
 */
const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        "flex h-11 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-10 text-base text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-destructive",
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      aria-hidden
      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
    />
  </div>
));
Select.displayName = "Select";

export { Select };
