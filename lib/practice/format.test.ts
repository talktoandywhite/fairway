import { describe, expect, it } from "vitest";

import { formatMinutes, formatShare, formatShareRange } from "./format";

describe("formatMinutes", () => {
  it("reads minutes under an hour as minutes", () => {
    expect(formatMinutes(0)).toBe("0m");
    expect(formatMinutes(45)).toBe("45m");
    expect(formatMinutes(59)).toBe("59m");
  });

  it("drops the minutes on a whole hour", () => {
    expect(formatMinutes(60)).toBe("1h");
    expect(formatMinutes(600)).toBe("10h");
  });

  it("reads a mixed duration", () => {
    expect(formatMinutes(90)).toBe("1h 30m");
    expect(formatMinutes(185)).toBe("3h 5m");
  });
});

describe("formatShare", () => {
  it("renders a fraction as a whole percent", () => {
    expect(formatShare(0)).toBe("0%");
    expect(formatShare(0.423)).toBe("42%");
    expect(formatShare(0.425)).toBe("43%");
    expect(formatShare(1)).toBe("100%");
  });
});

describe("formatShareRange", () => {
  it("renders a target band with an en dash", () => {
    expect(formatShareRange(0.55, 0.7)).toBe("55–70%");
  });
});
