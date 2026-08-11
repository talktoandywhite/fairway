import { CircleAlert, CircleCheck } from "lucide-react";

/**
 * Form-level status banner. Two tones only: an error and a success/info notice.
 * Both ship with an icon AND text — color never carries the meaning alone
 * (DESIGN.md). Rendered with `role` set so assistive tech announces it.
 */
export function FormAlert({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: React.ReactNode;
}) {
  const isError = tone === "error";
  const Icon = isError ? CircleAlert : CircleCheck;
  return (
    <div
      role={isError ? "alert" : "status"}
      className={
        "flex items-start gap-2 rounded-md border px-3 py-2 text-sm " +
        (isError
          ? "border-destructive/40 text-destructive"
          : "border-input text-foreground")
      }
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
