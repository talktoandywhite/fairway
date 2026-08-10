import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", false, "b", undefined, "c")).toBe("a b c");
  });

  it("resolves conflicting Tailwind classes in favor of the last", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
