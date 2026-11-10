import { afterEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/db/postgres";
import { publisherRepository } from "@/repositories/publisher";
import { asyncTaskBus } from "@/services/async-task";
import { publisherService } from "@/services/publisher";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";

vi.mock("@/services/async-task", () => ({ asyncTaskBus: { publish: vi.fn() } }));

afterEach(() => vi.restoreAllMocks());

describe("publisherService.updatePublisher : déclenchement du rebuild", () => {
  it.each([
    { label: "champ sans impact sur la diffusion", patch: { name: "Nouveau nom" }, changed: false, sync: false },
    { label: "liste identique", patch: { publishers: [] }, changed: false, sync: true },
    { label: "liste modifiée", patch: { publishers: [] }, changed: true, sync: true },
    { label: "suppression explicite des partenaires", patch: { publishers: null }, changed: true, sync: true },
    { label: "retrait du dernier droit de diffusion", patch: { hasApiRights: false }, changed: true, sync: true },
  ])("$label", async ({ patch, changed, sync }) => {
    const publisher = { id: "diffuseur", hasApiRights: true, hasWidgetRights: false, hasCampaignRights: false };
    vi.spyOn(publisherRepository, "findUnique").mockResolvedValue(publisher as never);
    const synchronize = vi.spyOn(publisherDiffusionRuleService, "syncScopeRoots").mockResolvedValue(changed);
    vi.spyOn(publisherDiffusionRuleService, "findRules").mockResolvedValue([]);
    vi.mocked(prisma.publisherDemarcheSimplifiee.findMany).mockResolvedValue([]);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      if (typeof callback !== "function") {
        throw new Error("Transaction callback expected");
      }
      return callback({ publisher: { update: vi.fn().mockResolvedValue(publisher) } } as never);
    });

    await publisherService.updatePublisher("diffuseur", patch);

    expect(synchronize).toHaveBeenCalledTimes(sync ? 1 : 0);
    expect(asyncTaskBus.publish).toHaveBeenCalledTimes(changed ? 1 : 0);
    if (changed) {
      expect(asyncTaskBus.publish).toHaveBeenCalledWith({ type: "publisher.diffusion", payload: { publisherId: "diffuseur" } });
    }
  });
});
