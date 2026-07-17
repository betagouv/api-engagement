import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/db/postgres";
import { MissionDiffusionRebuildHandler } from "@/jobs/mission-diffusion-rebuild/handler";
import { missionDiffusionRepository } from "@/repositories/mission-diffusion";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";

import { createTestMission, createTestPublisher } from "../../../fixtures";

/**
 * Tests d'intégration du job de rebuild de `mission_diffusion`.
 *
 * Périmètre : ce qui n'est prouvable que contre une vraie base — l'exécution du `where` d'allowlist
 * (jointures d'organisation, soft-delete, scope propre) et la cohérence table ⇄ where de référence.
 * La logique de diff et la construction du `where` sont couvertes en tests unitaires
 * (src/services/mission-diffusion, src/services/publisher-diffusion-rule).
 */

const handler = new MissionDiffusionRebuildHandler();

const tableMissionIds = async (distributionPublisherId: string): Promise<Set<string>> =>
  new Set(await missionDiffusionRepository.findMissionIdsByDistributionPublisher(distributionPublisherId));

describe("MissionDiffusionRebuildHandler", () => {
  let diffuser: Awaited<ReturnType<typeof createTestPublisher>>;
  let annonceur: Awaited<ReturnType<typeof createTestPublisher>>;

  beforeEach(async () => {
    diffuser = await createTestPublisher({ name: "Diffuseur" });
    annonceur = await createTestPublisher({ name: "Annonceur" });
  });

  it("matérialise l'allowlist et exclut missions propres, soft-deleted et autres publishers", async () => {
    const autre = await createTestPublisher({ name: "Autre" });
    await publisherDiffusionRuleService.findOrCreateScopeRoot(diffuser.id, annonceur.id);

    const fromAnnonceur = await createTestMission({ publisherId: annonceur.id, statusCode: "ACCEPTED", clientId: "a-1" });
    const own = await createTestMission({ publisherId: diffuser.id, statusCode: "ACCEPTED", clientId: "own-1" });
    const deleted = await createTestMission({ publisherId: annonceur.id, statusCode: "ACCEPTED", clientId: "del-1", deleted: true });
    const other = await createTestMission({ publisherId: autre.id, statusCode: "ACCEPTED", clientId: "autre-1" });

    const result = await handler.handle({});

    expect(result.success).toBe(true);
    expect(result.distributionPublishers).toBe(1);
    expect(await tableMissionIds(diffuser.id)).toEqual(new Set([fromAnnonceur.id]));
    // Ni le scope propre, ni les missions supprimées, ni les autres publishers.
    expect((await tableMissionIds(diffuser.id)).has(own.id)).toBe(false);
    expect((await tableMissionIds(diffuser.id)).has(deleted.id)).toBe(false);
    expect((await tableMissionIds(diffuser.id)).has(other.id)).toBe(false);
  });

  it("respecte une exclusion d'organisation (jointure publisher_organization réelle)", async () => {
    await publisherDiffusionRuleService.createScopedRule({
      diffuseurPublisherId: diffuser.id,
      annonceurPublisherId: annonceur.id,
      field: "publisherOrganization.clientId",
      fieldType: "string",
      operator: "is_not",
      value: "excluded-org",
    });

    const kept = await createTestMission({ publisherId: annonceur.id, statusCode: "ACCEPTED", clientId: "kept", organizationClientId: "kept-org" });
    const excluded = await createTestMission({ publisherId: annonceur.id, statusCode: "ACCEPTED", clientId: "excluded", organizationClientId: "excluded-org" });

    await handler.handle({});

    const ids = await tableMissionIds(diffuser.id);
    expect(ids.has(kept.id)).toBe(true);
    expect(ids.has(excluded.id)).toBe(false);
  });

  it("reproduit le where de référence (buildMissionDiffuseurCandidateWhere) hors scope propre", async () => {
    const annonceur2 = await createTestPublisher({ name: "Annonceur 2" });
    await publisherDiffusionRuleService.findOrCreateScopeRoot(diffuser.id, annonceur.id);
    await publisherDiffusionRuleService.createScopedRule({
      diffuseurPublisherId: diffuser.id,
      annonceurPublisherId: annonceur2.id,
      field: "publisherOrganization.clientId",
      fieldType: "string",
      operator: "is_not",
      value: "banni",
    });

    await createTestMission({ publisherId: annonceur.id, statusCode: "ACCEPTED", clientId: "a1-1" });
    await createTestMission({ publisherId: annonceur2.id, statusCode: "ACCEPTED", clientId: "a2-keep", organizationClientId: "ok" });
    await createTestMission({ publisherId: annonceur2.id, statusCode: "ACCEPTED", clientId: "a2-drop", organizationClientId: "banni" });
    await createTestMission({ publisherId: diffuser.id, statusCode: "ACCEPTED", clientId: "own" });

    await handler.handle({});

    const referenceWhere = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere(diffuser.id);
    const referenceRows = await prisma.mission.findMany({ where: { AND: [referenceWhere, { deletedAt: null }] }, select: { id: true } });
    const ownRows = await prisma.mission.findMany({ where: { publisherId: diffuser.id, deletedAt: null }, select: { id: true } });
    const ownIds = new Set(ownRows.map((row) => row.id));
    const expected = new Set(referenceRows.map((row) => row.id).filter((id) => !ownIds.has(id)));

    expect(await tableMissionIds(diffuser.id)).toEqual(expected);
  });

  it("est idempotent bout en bout : un second run relit l'état et n'écrit rien", async () => {
    await publisherDiffusionRuleService.findOrCreateScopeRoot(diffuser.id, annonceur.id);
    await createTestMission({ publisherId: annonceur.id, statusCode: "ACCEPTED", clientId: "a-1" });

    const first = await handler.handle({});
    expect(first.added).toBe(1);

    const second = await handler.handle({});
    expect(second.added).toBe(0);
    expect(second.removed).toBe(0);
  });
});
