import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEMARCHES_SIMPLIFIEES_BASE_URL, extractDemarcheSlug } from "@/services/demarches-simplifiees/utils";

describe("extractDemarcheSlug", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("returns the slug for a demarche hosted on the configured instance", () => {
    expect(extractDemarcheSlug(`${DEMARCHES_SIMPLIFIEES_BASE_URL}/commencer/ma-demarche`)).toBe("ma-demarche");
    expect(extractDemarcheSlug(`${DEMARCHES_SIMPLIFIEES_BASE_URL}/commencer/ma-demarche?utm_source=test`)).toBe("ma-demarche");
    expect(extractDemarcheSlug(`${DEMARCHES_SIMPLIFIEES_BASE_URL}/commencer/ma-demarche#section`)).toBe("ma-demarche");
  });

  it("returns null for a /commencer/ path hosted on another instance", () => {
    expect(extractDemarcheSlug("https://www.demarches-simplifiees.fr/commencer/ma-demarche")).toBeNull();
    expect(extractDemarcheSlug("https://evil.example.com/commencer/ma-demarche")).toBeNull();
  });

  it("returns null when the path is not a demarche", () => {
    expect(extractDemarcheSlug(`${DEMARCHES_SIMPLIFIEES_BASE_URL}/commencer`)).toBeNull();
    expect(extractDemarcheSlug(`${DEMARCHES_SIMPLIFIEES_BASE_URL}/autre/commencer/ma-demarche`)).toBeNull();
    expect(extractDemarcheSlug(`${DEMARCHES_SIMPLIFIEES_BASE_URL}/dossiers/12345`)).toBeNull();
  });

  it("returns null for empty and invalid urls", () => {
    expect(extractDemarcheSlug(null)).toBeNull();
    expect(extractDemarcheSlug(undefined)).toBeNull();
    expect(extractDemarcheSlug("")).toBeNull();
    expect(extractDemarcheSlug("pas-une-url")).toBeNull();
  });
});
