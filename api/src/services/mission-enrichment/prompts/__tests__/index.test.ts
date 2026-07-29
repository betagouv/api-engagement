import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/error", () => ({ captureMessage: vi.fn() }));

describe("PROMPT_REGISTRY / CURRENT_PROMPT_VERSION", () => {
  const originalEnv = process.env.MISSION_ENRICHMENT_PROMPT_VERSION;

  afterEach(() => {
    process.env.MISSION_ENRICHMENT_PROMPT_VERSION = originalEnv;
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("registers v4 on the albert provider (prompt v3, model only)", async () => {
    const { PROMPT_REGISTRY } = await import("@/services/mission-enrichment/prompts");
    expect(PROMPT_REGISTRY.v4).toBeDefined();
    expect((PROMPT_REGISTRY.v4.MODEL as { provider: string }).provider).toBe("albert");
  });

  it("keeps new taxonomies out of prompts v1 to v4", async () => {
    const { PROMPT_REGISTRY } = await import("@/services/mission-enrichment/prompts");

    for (const version of ["v1", "v2", "v3", "v4"] as const) {
      const prompt = PROMPT_REGISTRY[version];
      expect(prompt.TAXONOMY_KEYS).not.toContain("motivation_recherche");
      expect(prompt.TAXONOMY_KEYS).not.toContain("rythme");
      expect(prompt.TAXONOMY_KEYS).not.toContain("domaine_engagement");
      expect(prompt.TAXONOMY_KEYS).not.toContain("activite");
      expect(prompt.TAXONOMY_KEYS).not.toContain("equipe");
      expect(prompt.TAXONOMY_KEYS).not.toContain("interaction");
      expect(prompt.TAXONOMY_KEYS).not.toContain("autonomie");
      expect(prompt.TAXONOMY_KEYS).not.toContain("imprevu");
    }
  });

  it("registers v5 on the albert provider with the new taxonomies only", async () => {
    const { PROMPT_REGISTRY } = await import("@/services/mission-enrichment/prompts");

    const v5 = PROMPT_REGISTRY.v5;
    expect(v5).toBeDefined();
    expect((v5.MODEL as { provider: string }).provider).toBe("albert");

    // v5 enrichit les 8 nouvelles taxonomies du parcours de recommandation…
    for (const key of ["domaine_engagement", "rythme", "activite", "equipe", "interaction", "autonomie", "imprevu", "motivation_recherche"] as const) {
      expect(v5.TAXONOMY_KEYS).toContain(key);
    }
    // …et n'émet plus aucune des 7 anciennes.
    for (const key of ["domaine", "secteur_activite", "type_mission", "competence_rome", "region_internationale", "engagement_intent", "formation_onisep"] as const) {
      expect(v5.TAXONOMY_KEYS).not.toContain(key);
    }
  });

  it("resolves CURRENT_PROMPT_VERSION from a valid env value", async () => {
    process.env.MISSION_ENRICHMENT_PROMPT_VERSION = "v4";
    vi.resetModules();

    const { CURRENT_PROMPT_VERSION } = await import("@/services/mission-enrichment/prompts");
    expect(CURRENT_PROMPT_VERSION).toBe("v4");
  });

  it("falls back to the default version and reports to Sentry on an unknown env value", async () => {
    process.env.MISSION_ENRICHMENT_PROMPT_VERSION = "v-does-not-exist";
    vi.resetModules();

    const { captureMessage } = await import("@/error");
    const { CURRENT_PROMPT_VERSION, DEFAULT_PROMPT_VERSION } = await import("@/services/mission-enrichment/prompts");

    expect(CURRENT_PROMPT_VERSION).toBe(DEFAULT_PROMPT_VERSION);
    expect(DEFAULT_PROMPT_VERSION).toBe("v3");
    expect(captureMessage).toHaveBeenCalledOnce();
  });
});
