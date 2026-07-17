import { describe, expect, it } from "vitest";

import { publisherService } from "@/services/publisher";
import publisherDiffusionRuleService, { DIFFUSION_SCOPE_ROOT_CRITERIA } from "@/services/publisher-diffusion-rule";

import { createTestPublisher } from "../../fixtures";

describe("publisherService diffusion sync", () => {
  it("creates a self scope root when an API diffuser is created without explicit publishers", async () => {
    const diffuseur = await publisherService.createPublisher({ name: "API diffuseur self scope", hasApiRights: true });

    const roots = await publisherDiffusionRuleService.findRules({ publisherId: diffuseur.id, ...DIFFUSION_SCOPE_ROOT_CRITERIA });

    expect(diffuseur.publishers).toHaveLength(1);
    expect(diffuseur.publishers[0].publisherId).toBe(diffuseur.id);
    expect(roots.map((root) => root.value)).toEqual([diffuseur.id]);
  });

  it("does not create a self scope root when an API diffuser is created with an explicit empty publishers list", async () => {
    const diffuseur = await createTestPublisher({ name: "API diffuseur empty scope", hasApiRights: true, publishers: [] });

    expect(diffuseur.publishers).toHaveLength(0);
    expect(await publisherDiffusionRuleService.findRules({ publisherId: diffuseur.id, ...DIFFUSION_SCOPE_ROOT_CRITERIA })).toHaveLength(0);
  });

  it("does not create a self scope root for a widget-only diffuser without explicit publishers", async () => {
    const diffuseur = await createTestPublisher({
      name: "Widget-only diffuseur without scope",
      hasApiRights: false,
      hasWidgetRights: true,
      hasCampaignRights: false,
      publishers: [],
    });

    expect(diffuseur.publishers).toHaveLength(0);
    expect(await publisherDiffusionRuleService.findRules({ publisherId: diffuseur.id, ...DIFFUSION_SCOPE_ROOT_CRITERIA })).toHaveLength(0);
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

  it("clears all scope roots when publishers is null", async () => {
    const annonceur = await createTestPublisher({ name: "Annonceur" });
    const diffuseur = await createTestPublisher({ name: "Diffuseur", publishers: [{ publisherId: annonceur.id }] });

    const updated = await publisherService.updatePublisher(diffuseur.id, { publishers: null });

    expect(updated.publishers).toHaveLength(0);
    expect(await publisherDiffusionRuleService.findRules({ publisherId: diffuseur.id, combinedWithId: null })).toHaveLength(0);
  });

  it("creates a self scope root when API rights are enabled without explicit publishers", async () => {
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

  it("keeps existing partner scope roots when API rights are enabled without explicit publishers", async () => {
    const annonceur = await createTestPublisher({ name: "Existing annonceur" });
    const diffuseur = await createTestPublisher({
      name: "Widget diffuseur promoted to API",
      hasApiRights: false,
      hasWidgetRights: true,
      hasCampaignRights: true,
      publishers: [{ publisherId: annonceur.id }],
    });

    const updated = await publisherService.updatePublisher(diffuseur.id, { hasApiRights: true });

    expect(updated.publishers.map((publisher) => publisher.publisherId)).toEqual([annonceur.id]);
    expect((await publisherDiffusionRuleService.findRules({ publisherId: diffuseur.id, ...DIFFUSION_SCOPE_ROOT_CRITERIA })).map((root) => root.value)).toEqual([annonceur.id]);
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
