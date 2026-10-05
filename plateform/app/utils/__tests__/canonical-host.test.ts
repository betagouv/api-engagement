import { describe, expect, it } from "vitest";
import { getCanonicalRedirectUrl } from "../canonical-host";

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
