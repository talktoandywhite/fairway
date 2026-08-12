"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteRoundAction } from "@/app/(app)/rounds/actions";

/**
 * Delete a round, always behind an explicit confirmation — a round is honest
 * data an athlete may have taken a while to log, and a stray tap must not erase
 * it (Definition of Done: delete with confirmation).
 *
 * Two call shapes:
 *   - Pass `onConfirm` (the list does) to hand control back to a parent that
 *     removes the row optimistically and drives the server action inside its own
 *     transition.
 *   - Omit it (the detail page does) and this component calls `deleteRoundAction`
 *     itself; the action redirects back to the list.
 *
 * The dialog is a native `<dialog>` opened with `showModal()`, so focus trapping,
 * Escape-to-close, and the `alertdialog` semantics come from the platform.
 */
export function DeleteRoundButton({
  roundId,
  courseLabel,
  onConfirm,
  size = "default",
}: {
  roundId: string;
  /** e.g. "Tenison Highlands on May 2" — names what will be deleted. */
  courseLabel: string;
  onConfirm?: () => void;
  size?: "default" | "sm";
}) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = React.useTransition();

  const open = () => dialogRef.current?.showModal();
  const close = () => dialogRef.current?.close();

  const handleConfirm = () => {
    close();
    if (onConfirm) {
      onConfirm();
      return;
    }
    const fd = new FormData();
    fd.set("id", roundId);
    startTransition(() => deleteRoundAction(fd));
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size={size}
        onClick={open}
        disabled={isPending}
        aria-label={`Delete round at ${courseLabel}`}
      >
        <Trash2 aria-hidden />
        {size === "sm" ? null : "Delete"}
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby="delete-round-title"
        className="m-auto w-[min(92vw,26rem)] rounded-lg border border-border bg-card p-6 text-foreground shadow-lg backdrop:bg-foreground/40"
      >
        <div className="flex flex-col gap-4" role="alertdialog">
          <div className="flex flex-col gap-2">
            <h2
              id="delete-round-title"
              className="text-lg font-semibold tracking-tight"
            >
              Delete this round?
            </h2>
            <p className="text-sm text-muted-foreground">
              {courseLabel} will be removed for good. This can&apos;t be undone.
            </p>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={close}>
              Keep it
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirm}>
              Delete round
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
