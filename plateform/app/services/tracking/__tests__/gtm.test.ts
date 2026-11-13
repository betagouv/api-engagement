import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const consent = vi.hoisted(() => ({ enabled: false }));
vi.mock("~/services/gtm-consent", () => ({ isGtmTrackingEnabled: () => consent.enabled }));

import { createGtmProvider } from "../providers/gtm";

describe("provider GTM", () => {
  beforeEach(() => {
    consent.enabled = false;
  });
  afterEach(() => vi.unstubAllGlobals());

  it("pousse l'évènement et ses propriétés dans dataLayer", () => {
    const dataLayer: unknown[] = [];
    vi.stubGlobal("window", { dataLayer });
    consent.enabled = true;

    createGtmProvider().track("cta.clicked", { cta_destination: "quiz", page_name: "homepage" });

    expect(dataLayer).toEqual([{ event: "cta.clicked", cta_destination: "quiz", page_name: "homepage" }]);
  });

  it("n'émet rien tant que GTM n'est pas activé par un accord", () => {
    vi.stubGlobal("window", {});
    expect(() => createGtmProvider().track("page.viewed")).not.toThrow();
  });

  it("ne considère pas la présence du dataLayer comme un accord", () => {
    const dataLayer: unknown[] = [{ event: "consent.updated", consent_google: "denied" }];
    vi.stubGlobal("window", { dataLayer });
    createGtmProvider().track("page.viewed");

    expect(dataLayer).toEqual([{ event: "consent.updated", consent_google: "denied" }]);
  });
});
