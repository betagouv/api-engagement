import { describe, expect, it } from "vitest";

import { publisherService } from "@/services/publisher";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";

import { createTestPublisher } from "../../fixtures";

describe("publisherService diffusion sync", () => {
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

  it("rolls back publisher update when scope root synchronization fails", async () => {
    const diffuseur = await createTestPublisher({ name: "Diffuseur before rollback" });

    await expect(
      publisherService.updatePublisher(diffuseur.id, {
        name: "Diffuseur after failed rollback",
        publishers: [{ publisherId: "invalid\u0000publisher" }],
      })
    ).rejects.toThrow();

    const persisted = await publisherService.findOnePublisherById(diffuseur.id);
    expect(persisted?.name).toBe("Diffuseur before rollback");
    expect(await publisherDiffusionRuleService.findRules({ publisherId: diffuseur.id })).toHaveLength(0);
  });
});
