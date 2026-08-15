import { describe, expect, it } from "vitest";

import { eventSchema, nextStatus } from "./event";

/**
 * The event schema's contract, pinned. The stakes here are the money conversion
 * (dollars in, integer cents out — never a float) and the blank-vs-zero fee
 * distinction (an unknown fee is null, a free event is 0), plus that an event date
 * is NOT bound to the past the way a round's is.
 */

/** A complete, valid raw input — tests override just the field under test. */
function raw(partial: Record<string, unknown> = {}) {
  return {
    name: "NTPGA Medalist #1",
    plays_on: "2026-09-05",
    tour_id: null,
    course: "Tenison Highlands",
    city: "Dallas",
    holes: 18,
    entry_fee: "85",
    priority: "priority",
    status: "not_registered",
    notes: null,
    ...partial,
  };
}

describe("eventSchema — entry fee (dollars → integer cents)", () => {
  it("converts a whole-dollar string to cents", () => {
    const parsed = eventSchema.parse(raw({ entry_fee: "85" }));
    expect(parsed.entry_fee_cents).toBe(8500);
  });

  it("converts dollars-and-cents without floating-point drift", () => {
    // 0.1 + 0.2 territory: 12.30 * 100 must land on exactly 1230.
    expect(eventSchema.parse(raw({ entry_fee: "12.30" })).entry_fee_cents).toBe(
      1230,
    );
    expect(
      eventSchema.parse(raw({ entry_fee: "1,234.56" })).entry_fee_cents,
    ).toBe(123456);
  });

  it("strips a $ and commas", () => {
    expect(
      eventSchema.parse(raw({ entry_fee: "$1,234" })).entry_fee_cents,
    ).toBe(123400);
  });

  it("treats a blank fee as null (unknown), not 0", () => {
    expect(
      eventSchema.parse(raw({ entry_fee: "" })).entry_fee_cents,
    ).toBeNull();
    expect(
      eventSchema.parse(raw({ entry_fee: null })).entry_fee_cents,
    ).toBeNull();
  });

  it("keeps a recorded 0 as 0 cents (a free event)", () => {
    expect(eventSchema.parse(raw({ entry_fee: "0" })).entry_fee_cents).toBe(0);
  });

  it("rejects a negative fee", () => {
    expect(eventSchema.safeParse(raw({ entry_fee: "-5" })).success).toBe(false);
  });

  it("rejects non-numeric junk", () => {
    expect(eventSchema.safeParse(raw({ entry_fee: "lots" })).success).toBe(
      false,
    );
  });
});

describe("eventSchema — dates and optional text", () => {
  it("accepts a future date (an event is usually ahead, unlike a round)", () => {
    expect(eventSchema.safeParse(raw({ plays_on: "2099-01-01" })).success).toBe(
      true,
    );
  });

  it("rejects a malformed date", () => {
    expect(eventSchema.safeParse(raw({ plays_on: "09/05/2026" })).success).toBe(
      false,
    );
  });

  it("stores blank course / city / notes as null, not empty string", () => {
    const parsed = eventSchema.parse(
      raw({ course: "  ", city: "", notes: "   " }),
    );
    expect(parsed.course).toBeNull();
    expect(parsed.city).toBeNull();
    expect(parsed.notes).toBeNull();
  });

  it("normalizes a blank tour_id to null and rejects a non-uuid", () => {
    expect(eventSchema.parse(raw({ tour_id: "" })).tour_id).toBeNull();
    expect(eventSchema.safeParse(raw({ tour_id: "not-a-uuid" })).success).toBe(
      false,
    );
  });
});

describe("eventSchema — enums and holes", () => {
  it("rejects an unknown status or priority", () => {
    expect(eventSchema.safeParse(raw({ status: "cancelled" })).success).toBe(
      false,
    );
    expect(eventSchema.safeParse(raw({ priority: "critical" })).success).toBe(
      false,
    );
  });

  it("rejects holes other than 9 or 18 (the DB check constraint)", () => {
    expect(eventSchema.safeParse(raw({ holes: 36 })).success).toBe(false);
    expect(eventSchema.safeParse(raw({ holes: 9 })).success).toBe(true);
  });

  it("requires a name", () => {
    expect(eventSchema.safeParse(raw({ name: "" })).success).toBe(false);
  });
});

describe("nextStatus — the forward transition path", () => {
  it("advances not_registered → registered → played", () => {
    expect(nextStatus("not_registered")).toBe("registered");
    expect(nextStatus("registered")).toBe("played");
  });

  it("has no next step from played or skipped", () => {
    expect(nextStatus("played")).toBeNull();
    expect(nextStatus("skipped")).toBeNull();
  });
});
