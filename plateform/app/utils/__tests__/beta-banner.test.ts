import { describe, expect, it } from "vitest";
import { betaBannerCookieName, betaBannerDismissCookie, isBetaBannerDismissed } from "../beta-banner";

describe("isBetaBannerDismissed", () => {
  it("affiche le bandeau quand aucune fermeture n'est mémorisée", () => {
    expect(isBetaBannerDismissed("quiz", "")).toBe(false);
    expect(isBetaBannerDismissed("quiz", "plateform_consent=%7B%7D")).toBe(false);
  });

  it("masque le bandeau quand son cookie de fermeture est présent", () => {
    expect(isBetaBannerDismissed("quiz", `plateform_consent=%7B%7D; ${betaBannerCookieName("quiz")}=1`)).toBe(true);
  });

  it("mémorise la fermeture séparément pour le quiz et les résultats", () => {
    const cookieHeader = `${betaBannerCookieName("quiz")}=1`;

    expect(isBetaBannerDismissed("quiz", cookieHeader)).toBe(true);
    expect(isBetaBannerDismissed("results", cookieHeader)).toBe(false);
  });
});

describe("betaBannerDismissCookie", () => {
  it("mémorise la fermeture 30 jours sur tout le site", () => {
    expect(betaBannerDismissCookie("site", false)).toBe("plateform_beta_banner_dismissed_site=1; Path=/; Max-Age=2592000; SameSite=Lax");
  });

  it("ajoute Secure en HTTPS", () => {
    expect(betaBannerDismissCookie("site", true)).toBe("plateform_beta_banner_dismissed_site=1; Path=/; Max-Age=2592000; SameSite=Lax; Secure");
  });
});
