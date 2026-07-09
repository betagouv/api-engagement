import { describe, expect, it } from "vitest";

import { CAMPAIGN_ATTRIBUTION_STORAGE_KEY, CAMPAIGN_SESSION_TTL_MS, getCampaignParamsFromSearch, resolveActiveCampaign } from "../campaign-attribution";

// Faux Storage sur une Map, calqué sur le test internal-user-flag.
function createStorage(initial?: [string, string][]) {
  const map = new Map<string, string>(initial);
  return {
    map,
    storage: {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => map.set(key, value),
      removeItem: (key: string) => map.delete(key),
    },
  };
}

describe("getCampaignParamsFromSearch", () => {
  it("extrait les 3 UTM présents", () => {
    expect(getCampaignParamsFromSearch("?utm_source=google&utm_campaign=ete&utm_medium=cpc")).toEqual({
      utm_source: "google",
      utm_campaign: "ete",
      utm_medium: "cpc",
    });
  });

  it("n'extrait que les UTM présents (sous-ensemble partiel)", () => {
    expect(getCampaignParamsFromSearch("?utm_source=google")).toEqual({ utm_source: "google" });
  });

  it("ignore les paramètres non UTM et les valeurs vides", () => {
    expect(getCampaignParamsFromSearch("?internal=1&utm_source=&utm_campaign=ete")).toEqual({ utm_campaign: "ete" });
  });

  it("retourne un objet vide sur une URL sans UTM (trafic direct)", () => {
    expect(getCampaignParamsFromSearch("")).toEqual({});
    expect(getCampaignParamsFromSearch("?internal=1")).toEqual({});
  });

  it("accepte une instance URLSearchParams", () => {
    expect(getCampaignParamsFromSearch(new URLSearchParams("utm_medium=email"))).toEqual({ utm_medium: "email" });
  });
});

describe("resolveActiveCampaign", () => {
  it("persiste et retourne les UTM d'une nouvelle campagne", () => {
    const { map, storage } = createStorage();

    const active = resolveActiveCampaign("?utm_source=google&utm_medium=cpc", storage, 1000);

    expect(active).toEqual({ utm_source: "google", utm_medium: "cpc" });
    expect(JSON.parse(map.get(CAMPAIGN_ATTRIBUTION_STORAGE_KEY)!)).toEqual({
      params: { utm_source: "google", utm_medium: "cpc" },
      ts: 1000,
    });
  });

  it("écrase une attribution stockée quand une nouvelle campagne arrive (last non-direct)", () => {
    const { map, storage } = createStorage([[CAMPAIGN_ATTRIBUTION_STORAGE_KEY, JSON.stringify({ params: { utm_source: "old" }, ts: 500 })]]);

    const active = resolveActiveCampaign("?utm_source=new&utm_campaign=promo", storage, 2000);

    expect(active).toEqual({ utm_source: "new", utm_campaign: "promo" });
    expect(JSON.parse(map.get(CAMPAIGN_ATTRIBUTION_STORAGE_KEY)!)).toEqual({
      params: { utm_source: "new", utm_campaign: "promo" },
      ts: 2000,
    });
  });

  it("prolonge la session sur du direct dans la fenêtre TTL et met à jour le timestamp", () => {
    const stored = { params: { utm_source: "google" }, ts: 1000 };
    const { map, storage } = createStorage([[CAMPAIGN_ATTRIBUTION_STORAGE_KEY, JSON.stringify(stored)]]);

    const now = 1000 + CAMPAIGN_SESSION_TTL_MS; // pile à la limite → encore valide
    const active = resolveActiveCampaign("", storage, now);

    expect(active).toEqual({ utm_source: "google" });
    expect(JSON.parse(map.get(CAMPAIGN_ATTRIBUTION_STORAGE_KEY)!)).toEqual({ params: { utm_source: "google" }, ts: now });
  });

  it("purge et ne retourne rien sur du direct au-delà du TTL", () => {
    const { map, storage } = createStorage([[CAMPAIGN_ATTRIBUTION_STORAGE_KEY, JSON.stringify({ params: { utm_source: "google" }, ts: 1000 })]]);

    const active = resolveActiveCampaign("", storage, 1000 + CAMPAIGN_SESSION_TTL_MS + 1);

    expect(active).toEqual({});
    expect(map.has(CAMPAIGN_ATTRIBUTION_STORAGE_KEY)).toBe(false);
  });

  it("retourne un objet vide sur du direct sans attribution stockée", () => {
    const { map, storage } = createStorage();

    const active = resolveActiveCampaign("", storage, 1000);

    expect(active).toEqual({});
    expect(map.has(CAMPAIGN_ATTRIBUTION_STORAGE_KEY)).toBe(false);
  });

  it("ne conserve que les clés présentes d'une campagne partielle", () => {
    const { storage } = createStorage();

    const active = resolveActiveCampaign("?utm_source=google", storage, 1000);

    expect(active).toEqual({ utm_source: "google" });
  });

  it("ignore une valeur stockée corrompue et traite comme trafic direct", () => {
    const { map, storage } = createStorage([[CAMPAIGN_ATTRIBUTION_STORAGE_KEY, "{not-json"]]);

    const active = resolveActiveCampaign("", storage, 1000);

    expect(active).toEqual({});
    expect(map.get(CAMPAIGN_ATTRIBUTION_STORAGE_KEY)).toBe("{not-json");
  });
});
