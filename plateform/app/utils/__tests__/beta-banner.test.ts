import { describe, expect, it } from "vitest";
import { BETA_BANNER_DISMISS_TTL_MS, betaBannerStorageKey, dismissBetaBanner, isBetaBannerDismissed } from "../beta-banner";

const createStorage = (entries: Record<string, string> = {}) => {
  const store = new Map(Object.entries(entries));
  return {
    store,
    getItem: (key: string) => store.get(key) ?? null,
    removeItem: (key: string) => void store.delete(key),
    setItem: (key: string, value: string) => void store.set(key, value),
  };
};

describe("isBetaBannerDismissed", () => {
  it("affiche le bandeau quand aucune fermeture n'est mémorisée", () => {
    expect(isBetaBannerDismissed("quiz", createStorage())).toBe(false);
  });

  it("masque le bandeau pendant la fenêtre de 30 jours", () => {
    const now = 1_700_000_000_000;
    const storage = createStorage({ [betaBannerStorageKey("quiz")]: String(now - BETA_BANNER_DISMISS_TTL_MS + 1000) });

    expect(isBetaBannerDismissed("quiz", storage, now)).toBe(true);
  });

  it("réaffiche le bandeau et purge la clé une fois les 30 jours écoulés", () => {
    const now = 1_700_000_000_000;
    const storage = createStorage({ [betaBannerStorageKey("quiz")]: String(now - BETA_BANNER_DISMISS_TTL_MS - 1) });

    expect(isBetaBannerDismissed("quiz", storage, now)).toBe(false);
    expect(storage.store.has(betaBannerStorageKey("quiz"))).toBe(false);
  });

  it("réaffiche le bandeau et purge la clé quand la valeur stockée est illisible", () => {
    const storage = createStorage({ [betaBannerStorageKey("results")]: "hier" });

    expect(isBetaBannerDismissed("results", storage)).toBe(false);
    expect(storage.store.has(betaBannerStorageKey("results"))).toBe(false);
  });

  it("mémorise la fermeture séparément pour le quiz et les résultats", () => {
    const now = 1_700_000_000_000;
    const storage = createStorage();

    dismissBetaBanner("quiz", storage, now);

    expect(isBetaBannerDismissed("quiz", storage, now)).toBe(true);
    expect(isBetaBannerDismissed("results", storage, now)).toBe(false);
  });
});
