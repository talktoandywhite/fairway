import { describe, expect, it } from "vitest";

import {
  buildGuardianConsentEmail,
  guardianConsentUrl,
} from "@/lib/consent/email";

describe("guardianConsentUrl", () => {
  it("builds a /consent link carrying the token", () => {
    const url = guardianConsentUrl("abc-123");
    expect(url).toContain("/consent?token=abc-123");
  });
});

describe("buildGuardianConsentEmail", () => {
  const consentUrl = "https://fairway.example/consent?token=tok-1";

  it("names the athlete in the subject and includes the link in both parts", () => {
    const { subject, html, text } = buildGuardianConsentEmail({
      athleteName: "Sky",
      consentUrl,
    });
    expect(subject).toContain("Sky");
    expect(html).toContain(consentUrl);
    expect(text).toContain(consentUrl);
  });

  it("falls back to a neutral name when the athlete name is blank", () => {
    const { subject } = buildGuardianConsentEmail({
      athleteName: "   ",
      consentUrl,
    });
    expect(subject).toContain("A young golfer");
  });

  it("escapes a user-supplied name in the HTML so it can't inject markup", () => {
    const { html } = buildGuardianConsentEmail({
      athleteName: "<script>alert(1)</script>",
      consentUrl,
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
