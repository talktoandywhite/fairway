"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Stepper — a null-aware count input for the round form's detail fields.
 *
 * The null-not-zero contract lives here at the UI edge (see `lib/schemas/round.ts`):
 * an untouched stepper holds `null` ("not recorded"), shown as an empty box, and
 * that stays distinct from a recorded `0` (a genuinely clean round). The − and +
 * buttons are 44px for one-handed, in-sunlight tapping; the middle is a real
 * numeric input so a large value can be typed instead of tapped, and clearing it
 * returns the field to `null`.
 *
 * Tapping + on an empty field records `0` (the first, most common leak-free
 * value — reachable without typing); tapping − on an empty field does nothing.
 */
export function Stepper({
  id,
  value,
  onChange,
  min = 0,
  max = 200,
  ariaDescribedBy,
  invalid,
  label,
}: {
  id: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  ariaDescribedBy?: string;
  invalid?: boolean;
  /** Accessible name for the ± buttons, e.g. "penalty strokes". */
  label: string;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  const decrement = () => {
    if (value === null) return; // nothing recorded yet — stay unset
    onChange(clamp(value - 1));
  };

  const increment = () => {
    onChange(value === null ? min : clamp(value + 1));
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim();
    if (raw === "") {
      onChange(null); // cleared → not recorded
      return;
    }
    const n = Number(raw);
    if (Number.isNaN(n)) return;
    onChange(clamp(Math.trunc(n)));
  };

  return (
    <div className="flex items-stretch gap-2">
      <button
        type="button"
        onClick={decrement}
        disabled={value === null || value <= min}
        aria-label={`Decrease ${label}`}
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-input bg-background text-foreground",
          "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-40",
        )}
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value === null ? "" : String(value)}
        onChange={handleInput}
        aria-invalid={invalid || undefined}
        aria-describedby={ariaDescribedBy}
        placeholder="—"
        className={cn(
          "h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-center text-base",
          "data-value tabular-nums text-foreground placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "aria-[invalid=true]:border-destructive",
        )}
      />
      <button
        type="button"
        onClick={increment}
        disabled={value !== null && value >= max}
        aria-label={`Increase ${label}`}
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-input bg-background text-foreground",
          "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-40",
        )}
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}
