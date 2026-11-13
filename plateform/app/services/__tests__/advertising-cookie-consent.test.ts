import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tracking = vi.hoisted(() => ({ initTracking: vi.fn(), setTrackingConsentStatus: vi.fn() }));
vi.mock("~/services/config", () => ({
  POSTHOG_KEY: "phc_test",
  TRACKING_PROVIDER: "posthog",
  CRISP_WEBSITE_ID: "crisp-test",
  CRISP_BOT_SCENARIO_ID: "scenario-test",
  GTM_CONTAINER_ID: "GTM-test",
}));
vi.mock("~/services/tracking", () => tracking);

describe("gestionnaire de cookies et régies publicitaires", () => {
  let cookies: typeof import("../cookie-consent");
  let reload: ReturnType<typeof vi.fn>;
  let scripts: { id: string }[];
  const denied = { posthog: "denied", crisp: "denied", google: "denied", adform: "denied", tiktok: "denied", snapchat: "denied" } as const;
  const storedCookie = (preferences: Record<string, string>) =>
    `plateform_consent=${encodeURIComponent(JSON.stringify(Object.fromEntries(Object.entries(preferences).map(([id, status]) => [id, { status, version: 1 }]))))}`;
  const consentEvents = () => window.dataLayer?.filter((item) => (item as { event: string }).event === "consent.updated");

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    reload = vi.fn();
    scripts = [];
    vi.stubGlobal("window", { location: { protocol: "https:", reload } });
    vi.stubGlobal("document", {
      cookie: "",
      getElementById: (id: string) => scripts.find((script) => script.id === id),
      createElement: () => ({}),
      head: { appendChild: (script: { id: string }) => scripts.push(script) },
    });
    cookies = await import("../cookie-consent");
  });

  afterEach(() => vi.unstubAllGlobals());

  it("remplace GTM par quatre services sans modifier PostHog et Crisp", async () => {
    const { getConsentServices } = await import("../consent-services");
    expect(getConsentServices().map((service) => service.id)).toEqual(["posthog", "crisp", "google", "adform", "tiktok", "snapchat"]);
  });

  it.each(["granted", "denied"])("ne convertit pas l'ancien choix GTM (%s) et conserve les autres choix", (status) => {
    document.cookie = storedCookie({ posthog: "granted", crisp: "denied", gtm: status });
    expect(cookies.getCookieConsentPreferences()).toEqual({
      posthog: "granted",
      crisp: "denied",
      google: "pending",
      adform: "pending",
      tiktok: "pending",
      snapchat: "pending",
    });
    cookies.prepareCookieConsent();

    expect(window.dataLayer).toBeUndefined();
    expect(scripts).toEqual([]);
    expect(tracking.setTrackingConsentStatus).toHaveBeenCalledWith("granted");
  });

  it("initialise une seule fois le signal depuis le cookie avant les premiers évènements", () => {
    document.cookie = storedCookie({ ...denied, tiktok: "granted" });
    cookies.prepareCookieConsent();
    cookies.prepareCookieConsent();

    expect(consentEvents()).toEqual([{ event: "consent.updated", consent_google: "denied", consent_adform: "denied", consent_tiktok: "granted", consent_snapchat: "denied" }]);
    expect(scripts.map((script) => script.id)).toEqual(["gtm-client"]);
    expect(reload).not.toHaveBeenCalled();
  });

  it("enregistre les six choix avant le signal, puis avant le reload sur retrait", () => {
    cookies.saveCookieConsent({ ...denied, google: "granted", snapchat: "granted" });
    const push = vi.spyOn(window.dataLayer!, "push");
    push.mockImplementation((...items) => {
      expect(cookies.getCookieConsentPreferences()).toEqual({ ...denied, snapchat: "granted" });
      return Array.prototype.push.apply(window.dataLayer, items);
    });
    reload.mockImplementation(() => {
      expect(cookies.getCookieConsentPreferences()).toEqual({ ...denied, snapchat: "granted" });
      expect(consentEvents()?.at(-1)).toEqual({
        event: "consent.updated",
        consent_google: "denied",
        consent_adform: "denied",
        consent_tiktok: "denied",
        consent_snapchat: "granted",
      });
    });
    cookies.saveCookieConsent({ ...denied, snapchat: "granted" });

    expect(reload).toHaveBeenCalledTimes(1);
    expect(consentEvents()).toHaveLength(2);
    expect(document.cookie).not.toContain("%22gtm%22");
  });

  it("synchronise aussi le signal avant un reload provoqué par Crisp, avec un seul reload global", () => {
    cookies.saveCookieConsent({ ...denied, crisp: "granted", google: "granted" });
    reload.mockImplementation(() => {
      expect(cookies.getCookieConsentPreferences()).toEqual(denied);
      expect(consentEvents()?.at(-1)).toEqual({
        event: "consent.updated",
        consent_google: "denied",
        consent_adform: "denied",
        consent_tiktok: "denied",
        consent_snapchat: "denied",
      });
      expect(tracking.setTrackingConsentStatus).toHaveBeenLastCalledWith("denied");
    });
    cookies.saveCookieConsent(denied);

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("publie un refus complet sans charger le conteneur lors de « tout refuser »", () => {
    cookies.saveCookieConsent(denied);

    expect(cookies.getCookieConsentPreferences()).toEqual(denied);
    expect(consentEvents()).toHaveLength(1);
    expect(scripts).toEqual([]);
    expect(reload).not.toHaveBeenCalled();
  });

  it("ne charge GTM qu'une fois et publie un seul signal lors de « tout accepter »", () => {
    cookies.saveCookieConsent({ posthog: "granted", crisp: "granted", google: "granted", adform: "granted", tiktok: "granted", snapchat: "granted" });

    expect(consentEvents()).toEqual([{ event: "consent.updated", consent_google: "granted", consent_adform: "granted", consent_tiktok: "granted", consent_snapchat: "granted" }]);
    expect(scripts.filter((script) => script.id === "gtm-client")).toHaveLength(1);
  });

  it("ignore un enregistrement incomplet, sans signal ni cookie ni chargement", () => {
    cookies.saveCookieConsent({ google: "granted" });

    expect(document.cookie).toBe("");
    expect(window.dataLayer).toBeUndefined();
    expect(scripts).toEqual([]);
    expect(reload).not.toHaveBeenCalled();
  });

  it("ne touche à rien côté serveur", () => {
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("document", undefined);
    expect(() => cookies.prepareCookieConsent()).not.toThrow();
    expect(() => cookies.saveCookieConsent(denied)).not.toThrow();
  });
});
