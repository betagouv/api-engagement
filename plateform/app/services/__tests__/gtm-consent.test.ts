import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const config = vi.hoisted(() => ({ GTM_CONTAINER_ID: "GTM-test" as string | undefined }));
vi.mock("~/services/config", () => config);

describe("consentements publicitaires GTM", () => {
  let consent: typeof import("../gtm-consent");
  let provider: ReturnType<typeof import("../tracking/providers/gtm").createGtmProvider>;
  let scripts: { id: string; src: string; async: boolean }[];
  let appendChild: ReturnType<typeof vi.fn>;

  const denied = { google: "denied", adform: "denied", tiktok: "denied", snapchat: "denied" } as const;
  const deniedEvent = { event: "consent.updated", consent_google: "denied", consent_adform: "denied", consent_tiktok: "denied", consent_snapchat: "denied" };
  const consentEvents = () => window.dataLayer?.filter((item) => (item as { event: string }).event === "consent.updated");

  beforeEach(async () => {
    vi.resetModules();
    config.GTM_CONTAINER_ID = "GTM-test";
    scripts = [];
    appendChild = vi.fn((script) => {
      // Le signal complet et gtm.js doivent déjà être en file avant toute requête au conteneur.
      expect(window.dataLayer?.[0]).toMatchObject({ event: "consent.updated" });
      expect(window.dataLayer?.at(-1)).toMatchObject({ event: "gtm.js" });
      scripts.push(script);
    });
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", {
      getElementById: (id: string) => scripts.find((script) => script.id === id),
      createElement: () => ({}),
      head: { appendChild },
    });
    consent = await import("../gtm-consent");
    provider = (await import("../tracking/providers/gtm")).createGtmProvider();
  });

  afterEach(() => vi.unstubAllGlobals());

  it("n'émet aucun signal ni évènement métier avant un premier choix publicitaire", () => {
    expect(consent.applyGtmConsentPreferences({})).toBe(false);
    expect(consent.applyGtmConsentPreferences({ google: "pending", adform: "pending", tiktok: "pending", snapchat: "pending" })).toBe(false);
    provider.track("page.viewed");

    expect(window.dataLayer).toBeUndefined();
    expect(appendChild).not.toHaveBeenCalled();
    expect(consent.isGtmTrackingEnabled()).toBe(false);
  });

  it("publie quatre refus sans charger GTM ni autoriser les évènements métier", () => {
    expect(consent.applyGtmConsentPreferences(denied)).toBe(false);
    provider.track("page.viewed");

    expect(window.dataLayer).toEqual([deniedEvent]);
    expect(appendChild).not.toHaveBeenCalled();
    expect(consent.isGtmTrackingEnabled()).toBe(false);
  });

  it("traite les choix manquants ou pending comme des refus dans le signal complet", () => {
    consent.applyGtmConsentPreferences({ tiktok: "granted", google: "pending" });

    expect(consentEvents()).toEqual([{ ...deniedEvent, consent_tiktok: "granted" }]);
    expect(scripts).toEqual([{ id: "gtm-client", async: true, src: "https://www.googletagmanager.com/gtm.js?id=GTM-test" }]);
  });

  it.each(Array.from({ length: 16 }, (_, mask) => [mask]))("applique la combinaison d'accords %i avec un seul signal", (mask) => {
    const preferences = Object.fromEntries(consent.GTM_CONSENT_SERVICE_IDS.map((id, index) => [id, mask & (1 << index) ? "granted" : "denied"]));
    consent.applyGtmConsentPreferences(preferences);

    expect(consentEvents()).toEqual([
      {
        event: "consent.updated",
        consent_google: preferences.google,
        consent_adform: preferences.adform,
        consent_tiktok: preferences.tiktok,
        consent_snapchat: preferences.snapchat,
      },
    ]);
    expect(appendChild).toHaveBeenCalledTimes(mask ? 1 : 0);
    expect(consent.isGtmTrackingEnabled()).toBe(Boolean(mask));
  });

  it("ne répète pas un état inchangé et ne charge le conteneur qu'une fois", () => {
    consent.applyGtmConsentPreferences({ ...denied, google: "granted" });
    consent.applyGtmConsentPreferences({ ...denied, google: "granted" });
    expect(consent.applyGtmConsentPreferences({ ...denied, google: "granted", adform: "granted" })).toBe(false);

    expect(consentEvents()).toHaveLength(2);
    expect(appendChild).toHaveBeenCalledTimes(1);
    expect(window.dataLayer?.filter((item) => (item as { event: string }).event === "gtm.js")).toHaveLength(1);
  });

  it("ne rejoue pas les évènements antérieurs à l'accord", () => {
    provider.track("before.choice");
    consent.applyGtmConsentPreferences(denied);
    provider.track("before.grant");
    consent.applyGtmConsentPreferences({ ...denied, snapchat: "granted" });
    provider.track("after.grant", { page_name: "homepage" });

    expect(window.dataLayer).toEqual([
      deniedEvent,
      { ...deniedEvent, consent_snapchat: "granted" },
      { event: "gtm.js", "gtm.start": expect.any(Number) },
      { event: "after.grant", page_name: "homepage" },
    ]);
  });

  it("conserve un dataLayer préexistant sans y rejouer les évènements métier sans accord", () => {
    const dataLayer = [{ event: "existing.event" }];
    window.dataLayer = dataLayer;
    provider.track("before.grant");
    consent.applyGtmConsentPreferences(denied);

    expect(window.dataLayer).toBe(dataLayer);
    expect(dataLayer).toEqual([{ event: "existing.event" }, deniedEvent]);
  });

  it.each(["denied", "pending"] as const)("demande un reload lors d'un retrait (%s), même avec une autre régie acceptée", (status) => {
    consent.applyGtmConsentPreferences({ ...denied, google: "granted", tiktok: "granted" });
    expect(consent.applyGtmConsentPreferences({ ...denied, google: status, tiktok: "granted" })).toBe(true);
    provider.track("during.reload");

    expect(consentEvents()?.at(-1)).toEqual({ ...deniedEvent, consent_tiktok: "granted" });
    expect(consent.isGtmTrackingEnabled()).toBe(false);
    expect(window.dataLayer).not.toContainEqual({ event: "during.reload" });
    expect(appendChild).toHaveBeenCalledTimes(1);
    // Un nouvel enregistrement avant la navigation ne doit pas réactiver le tracking.
    expect(consent.applyGtmConsentPreferences({ ...denied, google: "granted", tiktok: "granted" })).toBe(true);
    expect(consent.isGtmTrackingEnabled()).toBe(false);
  });

  it("demande aussi un reload lorsque le dernier accord est retiré", () => {
    consent.applyGtmConsentPreferences({ ...denied, adform: "granted" });
    expect(consent.applyGtmConsentPreferences(denied)).toBe(true);
    expect(consentEvents()?.at(-1)).toEqual(deniedEvent);
    expect(consent.isGtmTrackingEnabled()).toBe(false);
  });

  it("révoque aussi un accord déjà appliqué si tous les choix redeviennent inconnus", () => {
    consent.applyGtmConsentPreferences({ google: "granted" });
    expect(consent.applyGtmConsentPreferences({})).toBe(true);
    expect(consentEvents()?.at(-1)).toEqual(deniedEvent);
    expect(consent.isGtmTrackingEnabled()).toBe(false);
  });

  it("ne publie rien si aucun conteneur n'est configuré", () => {
    config.GTM_CONTAINER_ID = undefined;
    expect(consent.applyGtmConsentPreferences({ google: "granted" })).toBe(false);
    expect(window.dataLayer).toBeUndefined();
    expect(appendChild).not.toHaveBeenCalled();
  });

  it("reste sans effet lors du rendu serveur", () => {
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("document", undefined);

    expect(consent.applyGtmConsentPreferences({ google: "granted" })).toBe(false);
    expect(consent.isGtmTrackingEnabled()).toBe(false);
    expect(() => provider.track("page.viewed")).not.toThrow();
  });
});
