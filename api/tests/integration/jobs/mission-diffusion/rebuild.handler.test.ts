import { beforeEach, describe, expect, it, vi } from "vitest";

// La resynchronisation Typesense (publication sur le bus des missions touchées) est couverte en tests
// unitaires ; ici on la neutralise pour cibler la correction du snapshot Postgres, tout en gardant un
// spy pour vérifier le câblage.
const publishMock = vi.hoisted(() => vi.fn());
vi.mock("@/services/async-task", () => ({ asyncTaskBus: { publish: publishMock } }));

import { prisma } from "@/db/postgres";
import { MissionDiffusionRebuildHandler } from "@/jobs/mission-diffusion-rebuild/handler";
import { missionDiffusionRepository } from "@/repositories/mission-diffusion";
import { publisherService } from "@/services/publisher";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";

import { createTestMission, createTestPublisher } from "../../../fixtures";

/**
 * Tests d'intégration du job de rebuild de `mission_diffusion`.
 *
 * Périmètre : ce qui n'est prouvable que contre une vraie base — l'exécution du `where` du snapshot
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
    publishMock.mockReset();
    publishMock.mockResolvedValue(undefined);
    diffuser = await createTestPublisher({ name: "Diffuseur" });
    annonceur = await createTestPublisher({ name: "Annonceur", hasApiRights: false });
  });

  it("matérialise l'allowlist et le scope propre, mais exclut soft-deleted et autres publishers", async () => {
    const autre = await createTestPublisher({ name: "Autre", hasApiRights: false });
    await publisherDiffusionRuleService.findOrCreateScopeRoot(diffuser.id, annonceur.id);

    const fromAnnonceur = await createTestMission({ publisherId: annonceur.id, statusCode: "ACCEPTED", clientId: "a-1" });
    const own = await createTestMission({ publisherId: diffuser.id, statusCode: "ACCEPTED", clientId: "own-1" });
    const deleted = await createTestMission({ publisherId: annonceur.id, statusCode: "ACCEPTED", clientId: "del-1", deleted: true });
    const other = await createTestMission({ publisherId: autre.id, statusCode: "ACCEPTED", clientId: "autre-1" });

    const result = await handler.handle({});

    expect(result.success).toBe(true);
    expect(result.distributionPublishers).toBe(1);
    expect(await tableMissionIds(diffuser.id)).toEqual(new Set([fromAnnonceur.id, own.id]));
    // Ni les missions supprimées, ni les missions des publishers hors périmètre.
    expect((await tableMissionIds(diffuser.id)).has(deleted.id)).toBe(false);
    expect((await tableMissionIds(diffuser.id)).has(other.id)).toBe(false);

    // Chaque mission ajoutée au snapshot est republiée sur le bus pour resynchroniser Typesense.
    expect(result.reindexRequested).toBe(2);
    expect(publishMock).toHaveBeenCalledWith({ type: "mission.index", payload: { missionId: fromAnnonceur.id, action: "upsert" } });
    expect(publishMock).toHaveBeenCalledWith({ type: "mission.index", payload: { missionId: own.id, action: "upsert" } });
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

  it("reproduit le where de référence complet (buildMissionDiffuseurCandidateWhere)", async () => {
    const annonceur2 = await createTestPublisher({ name: "Annonceur 2", hasApiRights: false });
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
    const expected = new Set(referenceRows.map((row) => row.id));

    expect(await tableMissionIds(diffuser.id)).toEqual(expected);
  });

  it("matérialise les missions propres d'un publisher API sans règle", async () => {
    const own = await createTestMission({ publisherId: diffuser.id, statusCode: "ACCEPTED", clientId: "own-only" });
    const fromAnotherPublisher = await createTestMission({ publisherId: annonceur.id, statusCode: "ACCEPTED", clientId: "other" });

    const result = await handler.handle({});

    expect(result.distributionPublishers).toBe(1);
    expect(await tableMissionIds(diffuser.id)).toEqual(new Set([own.id]));
    expect((await tableMissionIds(diffuser.id)).has(fromAnotherPublisher.id)).toBe(false);
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

  it("purge le snapshot d'un diffuseur soft-deleted même si ses règles restent en base", async () => {
    await publisherDiffusionRuleService.findOrCreateScopeRoot(diffuser.id, annonceur.id);
    const mission = await createTestMission({ publisherId: annonceur.id, statusCode: "ACCEPTED", clientId: "a-1" });

    await handler.handle({});
    expect(await tableMissionIds(diffuser.id)).toEqual(new Set([mission.id]));

    await publisherService.softDeletePublisher(diffuser.id);
    expect(await publisherDiffusionRuleService.findRules({ publisherId: diffuser.id })).not.toHaveLength(0);

    // On isole la republication du run de purge (le premier run a déjà publié la mission à l'ajout).
    publishMock.mockClear();
    const result = await handler.handle({});

    expect(await tableMissionIds(diffuser.id)).toEqual(new Set());
    expect(result.prunedDistributionPublishers).toBeGreaterThan(0);
    // La mission purgée est republiée pour perdre le diffuseur côté Typesense.
    expect(publishMock).toHaveBeenCalledWith({ type: "mission.index", payload: { missionId: mission.id, action: "upsert" } });
  });
});
