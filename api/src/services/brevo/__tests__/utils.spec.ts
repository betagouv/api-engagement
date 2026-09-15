import { describe, expect, it } from "vitest";

import { redactEmailParams, sanitizeEmailOptions } from "../utils";

describe("Brevo logging sanitization", () => {
  it("redacts every template parameter value", () => {
    const params = {
      code: "123456",
      link: "https://example.org/reset?token=secret",
      profile: { firstname: "Alice" },
    };

    expect(redactEmailParams(params)).toEqual({
      code: "[redacted]",
      link: "[redacted]",
      profile: "[redacted]",
    });
  });

  it("removes template parameter values from captured email options", () => {
    const sanitized = sanitizeEmailOptions({
      emailTo: ["alice@example.org"],
      params: { code: "123456" },
    });

    expect(sanitized).toEqual({
      emailTo: ["[redacted-email]"],
      emailBcc: undefined,
      params: { code: "[redacted]" },
    });
    expect(JSON.stringify(sanitized)).not.toContain("123456");
  });
});
