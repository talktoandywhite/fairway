"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deletePracticeAction } from "@/app/(app)/practice/actions";

/**
 * Delete a practice session, always behind an explicit confirmation — a stray
 * tap must not erase logged work (Definition of Done: delete with confirmation).
 *
 * Two call shapes, mirroring the round and event delete buttons:
 *   - Pass `onConfirm` (the list does) to hand control to a parent that removes
 *     the row optimistically and drives the action in its own transition.
 *   - Omit it (the detail page does) and this calls `deletePracticeAction`
 *     itself; the action redirects back to the log.
 *
 * The dialog is a native `<dialog>` opened with `showModal()`, so focus trapping,
 * Escape-to-close, and the `alertdialog` semantics come from the platform.
 */
export function DeletePracticeButton({
  sessionId,
  sessionLabel,
  onConfirm,
  size = "default",
}: {
  sessionId: string;
  /** e.g. "45m of putting on Apr 6" — names what will be deleted. */
  sessionLabel: string;
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
    fd.set("id", sessionId);
    startTransition(() => deletePracticeAction(fd));
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size={size}
        onClick={open}
        disabled={isPending}
        aria-label={`Delete practice session: ${sessionLabel}`}
      >
        <Trash2 aria-hidden />
        {size === "sm" ? null : "Delete"}
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby="delete-practice-title"
        className="m-auto w-[min(92vw,26rem)] rounded-lg border border-border bg-card p-6 text-foreground shadow-lg backdrop:bg-foreground/40"
      >
        <div className="flex flex-col gap-4" role="alertdialog">
          <div className="flex flex-col gap-2">
            <h2
              id="delete-practice-title"
              className="text-lg font-semibold tracking-tight"
            >
              Delete this session?
            </h2>
            <p className="text-sm text-muted-foreground">
              {sessionLabel} will be removed from your Practice Log, and its
              minutes will drop out of your rollup and your mix. This can&apos;t
              be undone.
            </p>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={close}>
              Keep it
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirm}>
              Delete session
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
