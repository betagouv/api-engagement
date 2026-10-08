import { describe, expect, it } from "vitest";
import { getCanonicalRedirectUrl, getLegacyHostRedirectUrl } from "../canonical-host";

describe("getCanonicalRedirectUrl", () => {
  it("redirige un domaine www vers le domaine canonique configuré en HTTPS", () => {
    expect(getCanonicalRedirectUrl("http://www.trouvetamission.gouv.fr/", "trouvetamission.gouv.fr")).toBe("https://trouvetamission.gouv.fr/");
  });

  it("conserve le chemin et les paramètres de recherche", () => {
    expect(getCanonicalRedirectUrl("https://www.trouvetamission.api-engagement-dev.fr/missions/123?source=campaign&page=2", "trouvetamission.api-engagement-dev.fr")).toBe(
      "https://trouvetamission.api-engagement-dev.fr/missions/123?source=campaign&page=2",
    );
  });

  it("ne redirige pas le domaine canonique", () => {
    expect(getCanonicalRedirectUrl("https://trouvetamission.gouv.fr/missions", "trouvetamission.gouv.fr")).toBeNull();
  });

  it("ne redirige pas quand aucun domaine canonique n'est configuré", () => {
    expect(getCanonicalRedirectUrl("https://www.trouvetamission.gouv.fr/quiz/age")).toBeNull();
  });

  it("ne redirige pas localhost même si un domaine canonique est configuré", () => {
    expect(getCanonicalRedirectUrl("http://localhost:3005/quiz/age", "trouvetamission.gouv.fr")).toBeNull();
  });
});

describe("getLegacyHostRedirectUrl", () => {
  const legacy = "plateforme.api-engagement.beta.gouv.fr";
  const canonical = "trouvetamission.gouv.fr";

  it("redirige l'ancien domaine vers le domaine canonique en conservant chemin et paramètres", () => {
    expect(getLegacyHostRedirectUrl(`https://${legacy}/missions/123?page=2`, legacy, canonical)).toBe("https://trouvetamission.gouv.fr/missions/123?page=2");
  });

  it("ne redirige pas un autre domaine", () => {
    expect(getLegacyHostRedirectUrl("https://trouvetamission.gouv.fr/", legacy, canonical)).toBeNull();
  });

  it("ne redirige pas quand l'ancien domaine n'est pas configuré", () => {
    expect(getLegacyHostRedirectUrl(`https://${legacy}/`, undefined, canonical)).toBeNull();
  });
});
