"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteEventAction } from "@/app/(app)/schedule/actions";

/**
 * Delete an event, always behind an explicit confirmation — a stray tap must not
 * erase a planned tournament (Definition of Done: delete with confirmation).
 *
 * Two call shapes, mirroring the round delete button:
 *   - Pass `onConfirm` (the list does) to hand control to a parent that removes
 *     the row optimistically and drives the action in its own transition.
 *   - Omit it (the detail page does) and this calls `deleteEventAction` itself;
 *     the action redirects back to the schedule.
 *
 * The dialog is a native `<dialog>` opened with `showModal()`, so focus trapping,
 * Escape-to-close, and the `alertdialog` semantics come from the platform.
 */
export function DeleteEventButton({
  eventId,
  eventLabel,
  onConfirm,
  size = "default",
}: {
  eventId: string;
  /** e.g. "NTPGA Medalist #1 on Aug 9" — names what will be deleted. */
  eventLabel: string;
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
    fd.set("id", eventId);
    startTransition(() => deleteEventAction(fd));
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size={size}
        onClick={open}
        disabled={isPending}
        aria-label={`Delete event ${eventLabel}`}
      >
        <Trash2 aria-hidden />
        {size === "sm" ? null : "Delete"}
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby="delete-event-title"
        className="m-auto w-[min(92vw,26rem)] rounded-lg border border-border bg-card p-6 text-foreground shadow-lg backdrop:bg-foreground/40"
      >
        <div className="flex flex-col gap-4" role="alertdialog">
          <div className="flex flex-col gap-2">
            <h2
              id="delete-event-title"
              className="text-lg font-semibold tracking-tight"
            >
              Delete this event?
            </h2>
            <p className="text-sm text-muted-foreground">
              {eventLabel} will be removed from your schedule. This can&apos;t
              be undone. If you just aren&apos;t playing it, mark it{" "}
              <span className="font-medium text-foreground">Skipped</span>{" "}
              instead — that keeps it on the plan without counting its fee.
            </p>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={close}>
              Keep it
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirm}>
              Delete event
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
