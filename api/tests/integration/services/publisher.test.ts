import { describe, expect, it } from "vitest";

import { publisherService } from "@/services/publisher";
import publisherDiffusionRuleService, { DIFFUSION_SCOPE_ROOT_CRITERIA } from "@/services/publisher-diffusion-rule";

import { createTestPublisher } from "../../fixtures";

describe("publisherService diffusion sync", () => {
  it("creates a self scope root when a diffuser is created without explicit publishers", async () => {
    const diffuseur = await createTestPublisher({ name: "Diffuseur self scope", publishers: [] });

    const roots = await publisherDiffusionRuleService.findRules({ publisherId: diffuseur.id, ...DIFFUSION_SCOPE_ROOT_CRITERIA });

    expect(diffuseur.publishers).toHaveLength(1);
    expect(diffuseur.publishers[0].publisherId).toBe(diffuseur.id);
    expect(roots.map((root) => root.value)).toEqual([diffuseur.id]);
  });

  it("rolls back publisher creation when scope root synchronization fails", async () => {
    await expect(
      publisherService.createPublisher({
        name: "Diffuseur rollback create",
        hasApiRights: true,
        publishers: [{ publisherId: "invalid\u0000publisher" }],
      })
    ).rejects.toThrow();

    await expect(publisherService.findOnePublisherByName("Diffuseur rollback create")).resolves.toBeNull();
  });

  it("keeps an explicit self scope root when publishers is null and rights stay enabled", async () => {
    const annonceur = await createTestPublisher({ name: "Annonceur" });
    const diffuseur = await createTestPublisher({ name: "Diffuseur", publishers: [{ publisherId: annonceur.id }] });

    const updated = await publisherService.updatePublisher(diffuseur.id, { publishers: null });

    expect(updated.publishers).toHaveLength(1);
    expect(updated.publishers[0].publisherId).toBe(diffuseur.id);
    expect((await publisherDiffusionRuleService.findRules({ publisherId: diffuseur.id, ...DIFFUSION_SCOPE_ROOT_CRITERIA })).map((root) => root.value)).toEqual([diffuseur.id]);
  });

  it("creates a self scope root when rights are enabled without explicit publishers", async () => {
    const diffuseur = await createTestPublisher({
      name: "Diffuseur rights disabled",
      hasApiRights: false,
      hasWidgetRights: false,
      hasCampaignRights: false,
      publishers: [],
    });

    expect(await publisherDiffusionRuleService.findRules({ publisherId: diffuseur.id, combinedWithId: null })).toHaveLength(0);

    const updated = await publisherService.updatePublisher(diffuseur.id, { hasApiRights: true });

    expect(updated.publishers).toHaveLength(1);
    expect(updated.publishers[0].publisherId).toBe(diffuseur.id);
  });

  it("rolls back publisher update when scope root synchronization fails", async () => {
    const diffuseur = await createTestPublisher({ name: "Diffuseur before rollback" });
    const initialRoots = await publisherDiffusionRuleService.findRules({ publisherId: diffuseur.id, ...DIFFUSION_SCOPE_ROOT_CRITERIA });

    await expect(
      publisherService.updatePublisher(diffuseur.id, {
        name: "Diffuseur after failed rollback",
        publishers: [{ publisherId: "invalid\u0000publisher" }],
      })
    ).rejects.toThrow();

    const persisted = await publisherService.findOnePublisherById(diffuseur.id);
    expect(persisted?.name).toBe("Diffuseur before rollback");
    expect(await publisherDiffusionRuleService.findRules({ publisherId: diffuseur.id, ...DIFFUSION_SCOPE_ROOT_CRITERIA })).toEqual(initialRoots);
  });
});
