import { afterEach, describe, expect, it, vi } from "vitest";

import { createGtmProvider } from "../providers/gtm";

describe("provider GTM", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("pousse l'évènement et ses propriétés dans dataLayer", () => {
    const dataLayer: unknown[] = [];
    vi.stubGlobal("window", { dataLayer });

    createGtmProvider().track("cta.clicked", { cta_destination: "quiz", page_name: "homepage" });

    expect(dataLayer).toEqual([{ event: "cta.clicked", cta_destination: "quiz", page_name: "homepage" }]);
  });

  it("n'émet rien tant que GTM n'est pas chargé (dataLayer absent = pas de consentement)", () => {
    vi.stubGlobal("window", {});
    expect(() => createGtmProvider().track("page.viewed")).not.toThrow();
  });
});
