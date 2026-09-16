import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../client", () => ({
  hasBrevoApiKey: () => false,
  requestBrevoApi: vi.fn(),
}));

import { sendTemplate, TEMPLATE_IDS } from "@/services/brevo/email";

describe("Brevo development logging", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not log MFA code values", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await sendTemplate(TEMPLATE_IDS.MFA_CODE, {
      emailTo: ["alice@example.org"],
      params: { code: "123456" },
    });

    const output = log.mock.calls.flat().join("\n");
    expect(output).toContain('"code": "[redacted]"');
    expect(output).not.toContain("123456");
  });

  it("keeps non-sensitive template parameters useful in development", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await sendTemplate(TEMPLATE_IDS.INVITATION, {
      emailTo: ["alice@example.org"],
      params: { link: "https://example.org/signup" },
    });

    expect(log.mock.calls.flat().join("\n")).toContain("https://example.org/signup");
  });
});
