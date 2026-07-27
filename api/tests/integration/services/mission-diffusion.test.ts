import { beforeEach, describe, expect, it, vi } from "vitest";

// createTestMission → missionService.create publie sur le bus (enrichment/scoring). On neutralise
// pour cibler le chemin par-mission et sa correction du snapshot Postgres.
vi.mock("@/services/async-task", () => ({ asyncTaskBus: { publish: vi.fn().mockResolvedValue(undefined) } }));

import { prisma } from "@/db/postgres";
import { missionDiffusionService } from "@/services/mission-diffusion";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";

import { createTestMission, createTestPublisher } from "../../fixtures";

/**
 * Tests d'intégration du chemin événementiel `rebuildForMission`.
 *
 * Périmètre : ce qui n'est prouvable que contre une vraie base — la compilation SQL des scopes
 * (jointure `publisher_organization`, champ array `parentOrganizations` via `unnest`, soft-delete)
 * et sa PARITÉ avec le `where` de référence du rebuild global (`buildMissionDiffuseurSnapshotWhere`).
 * La sélection des scopes candidats et la logique de remplacement sont couvertes en tests unitaires
 * (src/services/mission-diffusion, src/services/publisher-diffusion-rule, src/repositories).
 */

const snapshotPublisherIds = async (missionId: string): Promise<Set<string>> => {
  const rows = await prisma.missionDiffusion.findMany({ where: { missionId }, select: { distributionPublisherId: true } });
  return new Set(rows.map((row) => row.distributionPublisherId));
};

describe("missionDiffusionService.rebuildForMission (intégration)", () => {
  let diffuser: Awaited<ReturnType<typeof createTestPublisher>>;
  let annonceur: Awaited<ReturnType<typeof createTestPublisher>>;

  beforeEach(async () => {
    diffuser = await createTestPublisher({ name: "Diffuseur", hasApiRights: false });
    annonceur = await createTestPublisher({ name: "Annonceur", hasApiRights: true });
  });

  it("matérialise l'allowlist du diffuseur et le scope propre de l'annonceur", async () => {
    await publisherDiffusionRuleService.findOrCreateScopeRoot(diffuser.id, annonceur.id);
    const mission = await createTestMission({ publisherId: annonceur.id, statusCode: "ACCEPTED", clientId: "a-1" });

    const result = await missionDiffusionService.rebuildForMission(mission.id);

    // Le diffuseur (via sa root) + l'annonceur lui-même (scope propre, hasApiRights).
    expect(await snapshotPublisherIds(mission.id)).toEqual(new Set([diffuser.id, annonceur.id]));
    expect(result).toMatchObject({ missionId: mission.id, desired: 2, added: 2, removed: 0 });
  });

  it("respecte une exclusion d'organisation via la jointure publisher_organization réelle", async () => {
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

    await missionDiffusionService.rebuildForMission(kept.id);
    await missionDiffusionService.rebuildForMission(excluded.id);

    expect((await snapshotPublisherIds(kept.id)).has(diffuser.id)).toBe(true);
    expect((await snapshotPublisherIds(excluded.id)).has(diffuser.id)).toBe(false);
  });

  it("respecte une exclusion sur le champ array parentOrganizations (unnest réel)", async () => {
    await publisherDiffusionRuleService.createScopedRule({
      diffuseurPublisherId: diffuser.id,
      annonceurPublisherId: annonceur.id,
      field: "publisherOrganization.parentOrganizations",
      fieldType: "string",
      operator: "does_not_contain",
      value: "reseau-exclu",
    });

    const inReseau = await createTestMission({
      publisherId: annonceur.id,
      statusCode: "ACCEPTED",
      clientId: "in",
      organizationClientId: "org-in",
      organizationReseaux: ["reseau-exclu", "autre"],
    });
    const outReseau = await createTestMission({
      publisherId: annonceur.id,
      statusCode: "ACCEPTED",
      clientId: "out",
      organizationClientId: "org-out",
      organizationReseaux: ["autre"],
    });

    await missionDiffusionService.rebuildForMission(inReseau.id);
    await missionDiffusionService.rebuildForMission(outReseau.id);

    expect((await snapshotPublisherIds(inReseau.id)).has(diffuser.id)).toBe(false);
    expect((await snapshotPublisherIds(outReseau.id)).has(diffuser.id)).toBe(true);
  });

  it("purge le snapshot d'une mission soft-deleted (deleted_at IS NULL dans le SQL)", async () => {
    await publisherDiffusionRuleService.findOrCreateScopeRoot(diffuser.id, annonceur.id);
    const mission = await createTestMission({ publisherId: annonceur.id, statusCode: "ACCEPTED", clientId: "a-1" });

    await missionDiffusionService.rebuildForMission(mission.id);
    expect((await snapshotPublisherIds(mission.id)).size).toBeGreaterThan(0);

    await prisma.mission.update({ where: { id: mission.id }, data: { deletedAt: new Date() } });
    const result = await missionDiffusionService.rebuildForMission(mission.id);

    expect(await snapshotPublisherIds(mission.id)).toEqual(new Set());
    expect(result).toMatchObject({ desired: 0, added: 0 });
  });

  it("est à parité avec le where de référence du rebuild global (buildMissionDiffuseurSnapshotWhere)", async () => {
    const diffuserAll = await createTestPublisher({ name: "Diffuseur all", hasApiRights: false });
    const diffuserExcl = await createTestPublisher({ name: "Diffuseur excl", hasApiRights: false });
    const autreAnnonceur = await createTestPublisher({ name: "Autre annonceur", hasApiRights: false });

    // diffuserAll diffuse toutes les missions de l'annonceur ; diffuserExcl l'exclut si dans "reseau-exclu"
    // et ne diffuse par ailleurs qu'un autre annonceur (jamais candidat pour cette mission).
    await publisherDiffusionRuleService.findOrCreateScopeRoot(diffuserAll.id, annonceur.id);
    await publisherDiffusionRuleService.createScopedRule({
      diffuseurPublisherId: diffuserExcl.id,
      annonceurPublisherId: annonceur.id,
      field: "publisherOrganization.parentOrganizations",
      fieldType: "string",
      operator: "does_not_contain",
      value: "reseau-exclu",
    });
    await publisherDiffusionRuleService.findOrCreateScopeRoot(diffuserExcl.id, autreAnnonceur.id);

    const mission = await createTestMission({
      publisherId: annonceur.id,
      statusCode: "ACCEPTED",
      clientId: "m-1",
      organizationClientId: "org-1",
      organizationReseaux: ["reseau-exclu"],
    });

    await missionDiffusionService.rebuildForMission(mission.id);

    // Oracle : parcourt les diffuseurs candidats et garde ceux dont le where de référence matche la mission.
    const candidates = [diffuserAll.id, diffuserExcl.id, annonceur.id, autreAnnonceur.id];
    const expected = new Set<string>();
    for (const publisherId of candidates) {
      const where = await publisherDiffusionRuleService.buildMissionDiffuseurSnapshotWhere(publisherId);
      const match = await prisma.mission.findFirst({ where: { AND: [where, { id: mission.id, deletedAt: null }] }, select: { id: true } });
      if (match) {
        expected.add(publisherId);
      }
    }

    expect(await snapshotPublisherIds(mission.id)).toEqual(expected);
    // Contrôle explicite : all inclus, excl retiré (réseau exclu), annonceur en scope propre.
    expect(expected).toEqual(new Set([diffuserAll.id, annonceur.id]));
  });
});
