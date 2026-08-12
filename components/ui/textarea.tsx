import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Textarea — multi-line text on the Clubhouse surface, matching `Input`'s
 * `--input` control boundary and focus ring. Used for the round's optional notes
 * ("Two OB off the tee…") — free text, so never a required field.
 */
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[5rem] w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground",
      "placeholder:text-muted-foreground",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "aria-[invalid=true]:border-destructive",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
