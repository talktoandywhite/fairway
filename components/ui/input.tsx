import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Input — a text control on the Clubhouse surface.
 *
 * The boundary is `--input`, not `--border`: an input is something a person
 * operates, so it uses the control-boundary token that meets WCAG 1.4.11 3:1
 * (DESIGN.md). It is 44px tall (`h-11`) for the same parking-lot, one-handed
 * reason the buttons are. When `aria-invalid` is set, the boundary switches to
 * the destructive color so the error is not carried by the message text alone.
 * The focus ring is the global `:focus-visible` treatment — do not remove it.
 */
const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = "text", ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground",
      "placeholder:text-muted-foreground",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "aria-[invalid=true]:border-destructive",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
