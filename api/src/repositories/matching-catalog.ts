import { GATE_TAXONOMIES } from "@engagement/taxonomy";

import { Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";

const gateKeys = [...GATE_TAXONOMIES].sort();
const gateTaxonomies = new Set<string>(gateKeys);

type ScoringValue = { taxonomyKey: string | null; valueKey: string | null; score: number };

const buildGates = (missionScoringId: string, values: ScoringValue[]): Prisma.MatchingMissionGateCreateManyInput[] => {
  const allowedValuesByTaxonomy = new Map<string, Set<string>>();
  for (const value of values) {
    if (value.taxonomyKey === null || !gateTaxonomies.has(value.taxonomyKey)) {
      continue;
    }
    const allowedValues = allowedValuesByTaxonomy.get(value.taxonomyKey) ?? new Set<string>();
    // Une gate sans valeur comparable reste une contrainte, avec une liste vide.
    if (value.valueKey !== null) {
      allowedValues.add(value.valueKey);
    }
    allowedValuesByTaxonomy.set(value.taxonomyKey, allowedValues);
  }
  return [...allowedValuesByTaxonomy].map(([taxonomyKey, allowedValues]) => ({
    missionScoringId,
    taxonomyKey,
    allowedValues: [...allowedValues].sort(),
  }));
};

type ScoringProjection = {
  id: string;
  missionId: string;
  missionEnrichmentId: string;
  promptVersion: string;
  values: ScoringValue[];
};

/** Les appelants détiennent les verrous des enrichissements et scorings concernés. */
const publishScorings = async (tx: Prisma.TransactionClient, scorings: ScoringProjection[]): Promise<void> => {
  if (scorings.length === 0) {
    return;
  }
  const ids = scorings.map(({ id }) => id);
  const catalog = scorings.map((scoring) => ({
    missionScoringId: scoring.id,
    missionId: scoring.missionId,
    missionEnrichmentId: scoring.missionEnrichmentId,
    promptVersion: scoring.promptVersion,
    // État du dernier scoring publié, indépendant d'un enrichissement ultérieur.
    enrichmentStatus: "completed" as const,
  }));
  const gates = scorings.flatMap((scoring) => buildGates(scoring.id, scoring.values));
  const values: Prisma.MatchingMissionValueCreateManyInput[] = [];
  for (const scoring of scorings) {
    for (const value of scoring.values) {
      if (value.taxonomyKey === null || value.valueKey === null) {
        continue;
      }
      values.push({
        missionScoringId: scoring.id,
        missionId: scoring.missionId,
        promptVersion: scoring.promptVersion,
        taxonomyKey: value.taxonomyKey,
        valueKey: value.valueKey,
        score: value.score,
      });
    }
  }

  // Le parent reste stable. Seuls les enfants de ces scorings sont remplacés.
  await tx.matchingMissionCatalog.createMany({ data: catalog, skipDuplicates: true });
  await tx.matchingMissionCatalog.updateMany({
    where: { missionScoringId: { in: ids } },
    data: { enrichmentStatus: "completed", updatedAt: new Date() },
  });
  await tx.matchingMissionGate.deleteMany({ where: { missionScoringId: { in: ids } } });
  await tx.matchingMissionValue.deleteMany({ where: { missionScoringId: { in: ids } } });
  if (gates.length > 0) {
    await tx.matchingMissionGate.createMany({ data: gates });
  }
  if (values.length > 0) {
    await tx.matchingMissionValue.createMany({ data: values });
  }
};

export const matchingCatalogRepository = {
  async publishScoring(tx: Prisma.TransactionClient, scoring: ScoringProjection): Promise<void> {
    await publishScorings(tx, [scoring]);
  },

  async rebuildBatch(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    await prisma.$transaction(
      async (tx) => {
        // Même ordre que la publication du scoring ; aucun enrichissement ne peut
        // supprimer ses valeurs pendant la lecture de ce lot.
        await tx.$queryRaw(Prisma.sql`
        SELECT id FROM mission_enrichment
        WHERE id IN (SELECT mission_enrichment_id FROM mission_scoring WHERE id IN (${Prisma.join(ids)}))
        ORDER BY id FOR NO KEY UPDATE
      `);
        await tx.$queryRaw(Prisma.sql`SELECT id FROM mission_scoring WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR NO KEY UPDATE`);
        const scorings = await tx.missionScoring.findMany({
          where: { id: { in: ids }, missionEnrichment: { status: "completed" } },
          select: {
            id: true,
            missionId: true,
            missionEnrichmentId: true,
            updatedAt: true,
            missionEnrichment: { select: { promptVersion: true, completedAt: true } },
            missionScoringValues: { select: { taxonomyKey: true, valueKey: true, score: true, createdAt: true } },
          },
        });
        const published = scorings.filter((scoring) => {
          const completedAt = scoring.missionEnrichment.completedAt;
          // Entre la fin d'un enrichissement et son scoring, conserver la projection
          // précédente. Les dates des valeurs couvrent les scorings historiques dont
          // l'upsert ne mettait pas encore updatedAt à jour.
          return completedAt === null || scoring.updatedAt >= completedAt || scoring.missionScoringValues.some((value) => value.createdAt >= completedAt);
        });
        await publishScorings(
          tx,
          published.map((scoring) => ({
            id: scoring.id,
            missionId: scoring.missionId,
            missionEnrichmentId: scoring.missionEnrichmentId,
            promptVersion: scoring.missionEnrichment.promptVersion,
            values: scoring.missionScoringValues,
          }))
        );
      },
      { timeout: 60_000 }
    );
  },

  async beginBuild(promptVersion: string, buildId: string): Promise<void> {
    const state = { ready: false, valuesReady: false, buildId, gateTaxonomies: gateKeys };
    await prisma.$transaction(async (tx) => {
      await tx.matchingCatalogState.upsert({
        where: { promptVersion },
        create: { promptVersion, gateTaxonomies: gateKeys },
        update: {},
      });
      const claimed = await tx.matchingCatalogState.updateMany({
        where: { promptVersion, buildId: null },
        data: state,
      });
      if (claimed.count !== 1) {
        throw new Error("Un rebuild du catalogue est déjà en cours pour ce prompt.");
      }
    });
  },

  async finishBuild(promptVersion: string, buildId: string): Promise<boolean> {
    // Fournir les statistiques au planificateur avant activation. Ces commandes
    // PostgreSQL ne correspondent pas à une opération de modèle Prisma.
    await prisma.$executeRaw(Prisma.sql`ANALYZE matching_mission_catalog`);
    await prisma.$executeRaw(Prisma.sql`ANALYZE matching_mission_gate`);
    await prisma.$executeRaw(Prisma.sql`ANALYZE matching_mission_value`);
    const result = await prisma.matchingCatalogState.updateMany({
      where: { promptVersion, buildId },
      data: { ready: true, valuesReady: true, buildId: null, builtAt: new Date() },
    });
    return result.count === 1;
  },

  async abortBuild(promptVersion: string, buildId: string): Promise<void> {
    await prisma.matchingCatalogState.updateMany({
      where: { promptVersion, buildId },
      data: { ready: false, valuesReady: false, buildId: null },
    });
  },
};
