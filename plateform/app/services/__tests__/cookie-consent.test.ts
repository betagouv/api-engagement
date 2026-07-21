import { describe, expect, it } from "vitest";

import { parseTarteaucitronConsent } from "../cookie-consent";

describe("parseTarteaucitronConsent", () => {
  it.each([
    ["", "pending"],
    ["!posthog=wait", "pending"],
    ["!another=true!posthog=true", "granted"],
    ["!posthog=false!another=true", "denied"],
  ] as const)("convertit %j en %s", (cookie, expected) => {
    expect(parseTarteaucitronConsent(cookie)).toBe(expected);
  });
});
