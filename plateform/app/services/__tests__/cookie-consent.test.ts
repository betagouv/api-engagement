import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tracking = vi.hoisted(() => ({ initTracking: vi.fn(), setTrackingConsentStatus: vi.fn() }));

vi.mock("~/services/config", () => ({ POSTHOG_KEY: "phc_test", TRACKING_PROVIDER: "posthog" }));
vi.mock("~/services/tracking", () => tracking);

import { getCookieConsentPreferences, parseCookieConsent, saveCookieConsent } from "../cookie-consent";
import type { ConsentService } from "../consent-services";

describe("consentement cookies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("window", { location: { protocol: "https:" } });
    vi.stubGlobal("document", { cookie: "" });
  });

  afterEach(() => vi.unstubAllGlobals());

  it.each([
    [null, "pending"],
    ["unknown", "pending"],
    [JSON.stringify({ posthog: { status: "granted", version: 1 } }), "granted"],
    [JSON.stringify({ posthog: { status: "denied", version: 1 } }), "denied"],
  ] as const)("convertit la valeur %j en %s", (value, expected) => {
    expect(parseCookieConsent(value)).toEqual({ posthog: expected });
  });

  it("lit les choix versionnés dans le cookie du gestionnaire DSFR", () => {
    const stored = encodeURIComponent(JSON.stringify({ posthog: { status: "denied", version: 1 } }));
    expect(getCookieConsentPreferences(`another=value; plateform_consent=${stored}`)).toEqual({ posthog: "denied" });
    expect(getCookieConsentPreferences("another=value")).toEqual({ posthog: "pending" });
  });

  it("redemande le consentement lorsque la version d'un service change", () => {
    const service: ConsentService = {
      id: "analytics",
      version: 2,
      title: "Mesure d'audience",
      description: "Description",
      isEnabled: () => true,
      applyConsent: vi.fn(),
    };

    expect(parseCookieConsent(JSON.stringify({ analytics: { status: "granted", version: 1 } }), [service])).toEqual({ analytics: "pending" });
  });

  it("conserve les choix un an et les synchronise avec les services configurés", () => {
    saveCookieConsent({ posthog: "denied" });

    const stored = encodeURIComponent(JSON.stringify({ posthog: { status: "denied", version: 1 } }));
    expect(document.cookie).toBe(`plateform_consent=${stored}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`);
    expect(tracking.setTrackingConsentStatus).toHaveBeenCalledWith("denied");
    expect(tracking.initTracking).toHaveBeenCalledOnce();
  });
});
