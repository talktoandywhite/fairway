import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Label — pairs with a control via `htmlFor`. Sans, small, medium weight
 * (DESIGN.md: labels are UI text, never the serif). Every form control in the
 * app has one (Definition of Done: form inputs have labels).
 */
const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-sm font-medium leading-none text-foreground",
      className,
    )}
    {...props}
  />
));
Label.displayName = "Label";

export { Label };
