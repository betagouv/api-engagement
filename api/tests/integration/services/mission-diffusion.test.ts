import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/db/postgres";
import { missionDiffusionRepository } from "@/repositories/mission-diffusion";
import { missionDiffusionService } from "@/services/mission-diffusion";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";

import { createTestMission, createTestPublisher } from "../../fixtures";

/**
 * Tests d'intégration du recompute ciblé `mission_diffusion` pour une mission (chemin temps réel).
 * Prouve contre une vraie base : narrowing aux diffuseurs candidats, scope propre, diff add/remove,
 * idempotence. La construction du `where` est couverte par ailleurs (publisher-diffusion-rule).
 */

const tableDistributionPublisherIds = async (missionId: string): Promise<Set<string>> =>
  new Set((await missionDiffusionRepository.findDistributionPublishersByMission(missionId)).map((row) => row.distributionPublisher.id));

describe("missionDiffusionService.rebuildForMission", () => {
  let diffuser: Awaited<ReturnType<typeof createTestPublisher>>;
  let annonceur: Awaited<ReturnType<typeof createTestPublisher>>;

  beforeEach(async () => {
    diffuser = await createTestPublisher({ name: "Diffuseur" });
    annonceur = await createTestPublisher({ name: "Annonceur", hasApiRights: false });
  });

  it("matérialise la mission chez le diffuseur qui l'autorise via une root, et est idempotent", async () => {
    await publisherDiffusionRuleService.findOrCreateScopeRoot(diffuser.id, annonceur.id);
    const mission = await createTestMission({ publisherId: annonceur.id, statusCode: "ACCEPTED", clientId: "a-1" });

    const first = await missionDiffusionService.rebuildForMission(mission.id);
    expect(first).toEqual({ desired: 1, added: 1, removed: 0 });
    expect(await tableDistributionPublisherIds(mission.id)).toEqual(new Set([diffuser.id]));

    const second = await missionDiffusionService.rebuildForMission(mission.id);
    expect(second).toEqual({ desired: 1, added: 0, removed: 0 });
  });

  it("matérialise le scope propre d'un publisher API sans règle", async () => {
    const own = await createTestMission({ publisherId: diffuser.id, statusCode: "ACCEPTED", clientId: "own-1" });

    const result = await missionDiffusionService.rebuildForMission(own.id);

    expect(result).toEqual({ desired: 1, added: 1, removed: 0 });
    expect(await tableDistributionPublisherIds(own.id)).toEqual(new Set([diffuser.id]));
  });

  it("ne matérialise rien pour une mission d'un publisher hors périmètre", async () => {
    const outsider = await createTestPublisher({ name: "Hors périmètre", hasApiRights: false });
    const mission = await createTestMission({ publisherId: outsider.id, statusCode: "ACCEPTED", clientId: "out-1" });

    const result = await missionDiffusionService.rebuildForMission(mission.id);

    expect(result).toEqual({ desired: 0, added: 0, removed: 0 });
    expect(await tableDistributionPublisherIds(mission.id)).toEqual(new Set());
  });

  it("retire les lignes devenues hors périmètre (root supprimée)", async () => {
    const root = await publisherDiffusionRuleService.findOrCreateScopeRoot(diffuser.id, annonceur.id);
    const mission = await createTestMission({ publisherId: annonceur.id, statusCode: "ACCEPTED", clientId: "a-1" });
    await missionDiffusionService.rebuildForMission(mission.id);
    expect(await tableDistributionPublisherIds(mission.id)).toEqual(new Set([diffuser.id]));

    await publisherDiffusionRuleService.deleteRule(root.id);
    const result = await missionDiffusionService.rebuildForMission(mission.id);

    expect(result).toEqual({ desired: 0, added: 0, removed: 1 });
    expect(await tableDistributionPublisherIds(mission.id)).toEqual(new Set());
  });

  it("retire les lignes d'une mission soft-deleted (chemin DELETE v2)", async () => {
    await publisherDiffusionRuleService.findOrCreateScopeRoot(diffuser.id, annonceur.id);
    const mission = await createTestMission({ publisherId: annonceur.id, statusCode: "ACCEPTED", clientId: "a-1" });
    await missionDiffusionService.rebuildForMission(mission.id);
    expect(await tableDistributionPublisherIds(mission.id)).toEqual(new Set([diffuser.id]));

    await prisma.mission.update({ where: { id: mission.id }, data: { deletedAt: new Date() } });
    const result = await missionDiffusionService.rebuildForMission(mission.id);

    expect(result).toEqual({ desired: 0, added: 0, removed: 1 });
    expect(await tableDistributionPublisherIds(mission.id)).toEqual(new Set());
  });
});
