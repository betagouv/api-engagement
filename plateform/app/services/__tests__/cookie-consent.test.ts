import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tracking = vi.hoisted(() => ({ initTracking: vi.fn(), setTrackingConsentStatus: vi.fn() }));

vi.mock("~/services/config", () => ({ POSTHOG_KEY: "phc_test", TRACKING_PROVIDER: "posthog" }));
vi.mock("~/services/tracking", () => tracking);

import { getCookieConsentStatus, parseCookieConsent, parseLegacyTarteaucitronConsent, saveCookieConsent } from "../cookie-consent";

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
    ["granted", "granted"],
    ["denied", "denied"],
  ] as const)("convertit la valeur %j en %s", (value, expected) => {
    expect(parseCookieConsent(value)).toBe(expected);
  });

  it.each([
    [null, "pending"],
    ["!posthog=wait", "pending"],
    ["!another=true!posthog=true", "granted"],
    ["!posthog=false!another=true", "denied"],
  ] as const)("migre l'ancienne valeur Tarteaucitron %j en %s", (value, expected) => {
    expect(parseLegacyTarteaucitronConsent(value)).toBe(expected);
  });

  it("privilégie le choix DSFR courant sur l'ancien cookie Tarteaucitron", () => {
    expect(getCookieConsentStatus("tarteaucitron=!posthog=true; plateform_consent=denied")).toBe("denied");
  });

  it("restaure l'ancien choix lorsqu'aucun cookie DSFR n'existe encore", () => {
    expect(getCookieConsentStatus("another=value; tarteaucitron=!posthog=true")).toBe("granted");
  });

  it("conserve le choix un an et le synchronise avec PostHog", () => {
    saveCookieConsent("denied");

    expect(document.cookie).toBe("plateform_consent=denied; Path=/; Max-Age=31536000; SameSite=Lax; Secure");
    expect(tracking.setTrackingConsentStatus).toHaveBeenCalledWith("denied");
    expect(tracking.initTracking).toHaveBeenCalledOnce();
  });
});
