import { describe, expect, it } from "vitest";

import {
  feeCentsToDollarsInput,
  formatFeeCents,
  monthKey,
  monthLabel,
} from "./format";

describe("formatFeeCents", () => {
  it("formats cents as USD", () => {
    expect(formatFeeCents(8500)).toBe("$85.00");
    expect(formatFeeCents(123400)).toBe("$1,234.00");
  });

  it("distinguishes an unknown fee (null → TBD) from a free event (0 → Free)", () => {
    expect(formatFeeCents(null)).toBe("Fee TBD");
    expect(formatFeeCents(0)).toBe("Free");
  });
});

describe("feeCentsToDollarsInput", () => {
  it("round-trips whole dollars without a trailing .00", () => {
    expect(feeCentsToDollarsInput(8500)).toBe("85");
  });

  it("keeps the cents when there are any", () => {
    expect(feeCentsToDollarsInput(1230)).toBe("12.30");
  });

  it("is empty for an unset fee", () => {
    expect(feeCentsToDollarsInput(null)).toBe("");
  });
});

describe("month helpers", () => {
  it("keys by YYYY-MM via a pure slice (no timezone)", () => {
    expect(monthKey("2025-08-09")).toBe("2025-08");
    expect(monthKey("2026-01-31")).toBe("2026-01");
  });

  it("labels a month key in full", () => {
    expect(monthLabel("2025-08")).toBe("August 2025");
    expect(monthLabel("2026-01")).toBe("January 2026");
  });
});
