"use client";

import * as React from "react";
import { ArrowRight, MinusCircle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormAlert } from "@/app/(auth)/_components/form-alert";
import {
  EVENT_STATUS_LABELS,
  nextStatus,
  type EventStatus,
} from "@/lib/schemas/event";
import { setEventStatusAction } from "@/app/(app)/schedule/actions";

/**
 * The status controls on an event's detail page. The primary button walks the
 * happy path `not_registered → registered → played`; secondary controls skip an
 * event (off the plan, its fee no longer counted) or put a skipped one back, and
 * a played event can be reopened.
 *
 * On success we do a HARD navigation back to this event (`window.location`), which
 * guarantees a fresh server render — reliably surfacing the "log the round" offer
 * once an event is played. The softer options both had failure modes here: a
 * Server-Action redirect to the same URL is served from the client router cache
 * (shows the pre-change status), and `router.refresh()` inside a transition can
 * hang under load (leaving the button stuck). Marking an event `played` does NOT
 * create a round; the refreshed page renders the OFFER (see `page.tsx`), because
 * an event can be honestly played before its score is in hand.
 */
export function EventStatusControls({
  eventId,
  status,
}: {
  eventId: string;
  status: EventStatus;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  const change = (next: EventStatus) => {
    setError(undefined);
    setBusy(true);
    setEventStatusAction(eventId, next).then((result) => {
      if (result?.error) {
        setError(result.error);
        setBusy(false);
        return;
      }
      // Hard navigation → fresh server render (no router cache, no transition).
      window.location.assign(`/schedule/${eventId}`);
    });
  };

  const next = nextStatus(status);

  return (
    <div className="flex flex-col gap-3">
      {error ? <FormAlert tone="error">{error}</FormAlert> : null}
      <div className="flex flex-wrap gap-2">
        {next ? (
          <Button
            type="button"
            variant="primary"
            onClick={() => change(next)}
            disabled={busy}
          >
            Mark {EVENT_STATUS_LABELS[next].toLowerCase()}
            <ArrowRight aria-hidden />
          </Button>
        ) : null}

        {status === "not_registered" || status === "registered" ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => change("skipped")}
            disabled={busy}
          >
            <MinusCircle aria-hidden />
            Skip this event
          </Button>
        ) : null}

        {status === "skipped" ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => change("not_registered")}
            disabled={busy}
          >
            <RotateCcw aria-hidden />
            Put back on the plan
          </Button>
        ) : null}

        {status === "played" ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => change("registered")}
            disabled={busy}
          >
            <RotateCcw aria-hidden />
            Reopen (not played)
          </Button>
        ) : null}
      </div>
    </div>
  );
}
