import * as React from "react";
import { Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface AiNoteProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The coaching style this message was phrased for, e.g. "Coach Clark's
   * approach". Rendered as "· styled to {styleLabel}". Attribution is ALWAYS to
   * a style, never to a person — see DESIGN.md §6 and AI_COACH.md. Omit for the
   * deterministic fallback.
   */
  styleLabel?: string;
  /**
   * `ai` (default) labels the note "AI Coach Note" with the sparkle mark.
   * `fallback` renders the identical container for the deterministic,
   * AI-disabled path and labels it "Coach Note" with no AI attribution — the
   * app must be fully usable with the AI layer switched off.
   */
  variant?: "ai" | "fallback";
}

/**
 * AiNote — an AI-styled coaching message (DESIGN.md §6). A three-pixel
 * `--secondary-strong` left rule on a soft sage wash. The label is visible
 * text, it says AI, and it attributes to a style, not a person: a model-written
 * message appearing in a named coach's voice to a minor who may act on it is a
 * trust failure regardless of how good the message is.
 *
 * Every note carries a feedback control. The buttons are wired to a handler in
 * a later session; here they exist so the primitive already reserves the space.
 */
function AiNote({
  styleLabel,
  variant = "ai",
  className,
  children,
  ...props
}: AiNoteProps) {
  const isAi = variant === "ai";
  return (
    <div className={cn("ai-note", className)} {...props}>
      <div className="flex items-start justify-between gap-3">
        <p className="ai-note__label">
          {isAi ? <Sparkles className="size-3.5" aria-hidden="true" /> : null}
          <span>{isAi ? "AI Coach Note" : "Coach Note"}</span>
          {isAi && styleLabel ? (
            <span className="font-normal normal-case tracking-normal">
              · styled to {styleLabel}
            </span>
          ) : null}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="This note was helpful"
            className="rounded p-1 text-muted-foreground hover:text-foreground"
          >
            <ThumbsUp className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="This note was not helpful"
            className="rounded p-1 text-muted-foreground hover:text-foreground"
          >
            <ThumbsDown className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="ai-note__body">{children}</div>
    </div>
  );
}

export { AiNote };
