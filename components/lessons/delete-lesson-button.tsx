"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteLessonAction } from "@/app/(app)/lessons/actions";

/**
 * Delete a lesson, always behind an explicit confirmation — a stray tap must not
 * erase a record of what a coach said (Definition of Done: delete with
 * confirmation).
 *
 * Two call shapes, mirroring the round, event, and practice delete buttons:
 *   - Pass `onConfirm` (the list does) to hand control to a parent that removes
 *     the row optimistically and drives the action in its own transition.
 *   - Omit it (the detail page does) and this calls `deleteLessonAction` itself;
 *     the action redirects back to the log.
 *
 * The dialog is a native `<dialog>` opened with `showModal()`, so focus trapping,
 * Escape-to-close, and the `alertdialog` semantics come from the platform.
 */
export function DeleteLessonButton({
  lessonId,
  lessonLabel,
  onConfirm,
  size = "default",
}: {
  lessonId: string;
  /** e.g. "Lesson with Coach Diaz on Mar 12, 2026" — names what will be deleted. */
  lessonLabel: string;
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
    fd.set("id", lessonId);
    startTransition(() => deleteLessonAction(fd));
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size={size}
        onClick={open}
        disabled={isPending}
        aria-label={`Delete lesson: ${lessonLabel}`}
      >
        <Trash2 aria-hidden />
        {size === "sm" ? null : "Delete"}
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby="delete-lesson-title"
        className="m-auto w-[min(92vw,26rem)] rounded-lg border border-border bg-card p-6 text-foreground shadow-lg backdrop:bg-foreground/40"
      >
        <div className="flex flex-col gap-4" role="alertdialog">
          <div className="flex flex-col gap-2">
            <h2
              id="delete-lesson-title"
              className="text-lg font-semibold tracking-tight"
            >
              Delete this lesson?
            </h2>
            <p className="text-sm text-muted-foreground">
              {lessonLabel} will be removed from your Lesson Log — the swing
              key, the drill, and what changed go with it. This can&apos;t be
              undone.
            </p>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={close}>
              Keep it
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirm}>
              Delete lesson
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
