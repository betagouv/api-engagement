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

    for (const prompt of Object.values(PROMPT_REGISTRY)) {
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
