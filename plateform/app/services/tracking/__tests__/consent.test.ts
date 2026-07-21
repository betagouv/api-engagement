import { describe, expect, it } from "vitest";

import { sanitizePropertiesForConsent } from "../consent";

describe("sanitizePropertiesForConsent", () => {
  const properties = {
    distinct_id: "user-id",
    quiz_attempt_id: "attempt-id",
    quiz_session_id: "session-id",
    mission_id: "mission-id",
    rank: 2,
  };

  it.each(["pending", "denied"] as const)("retire les identifiants lorsque le consentement est %s", (status) => {
    expect(sanitizePropertiesForConsent(properties, status)).toEqual({ mission_id: "mission-id", rank: 2 });
  });

  it("conserve toutes les propriétés après acceptation", () => {
    expect(sanitizePropertiesForConsent(properties, "granted")).toBe(properties);
  });
});
