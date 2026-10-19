import { MissionScoring, Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";
import { matchingCatalogRepository } from "./matching-catalog";

export const missionScoringRepository = {
  async findUnique(params: Prisma.MissionScoringFindUniqueArgs): Promise<MissionScoring | null> {
    return prisma.missionScoring.findUnique(params);
  },

  async replaceForEnrichment(params: {
    missionId: string;
    missionEnrichmentId: string;
    enrichmentUpdatedAt: Date;
    values: Omit<Prisma.MissionScoringValueUncheckedCreateInput, "missionScoringId">[];
  }): Promise<MissionScoring | null> {
    return prisma.$transaction(async (tx) => {
      // Même ordre que le remplacement des valeurs d'enrichissement : enrichissement,
      // scoring, puis valeurs. Le calcul a eu lieu avant la transaction.
      await tx.$queryRaw(Prisma.sql`SELECT id FROM mission_enrichment WHERE id = ${params.missionEnrichmentId} FOR NO KEY UPDATE`);
      const enrichment = await tx.missionEnrichment.findUniqueOrThrow({
        where: { id: params.missionEnrichmentId },
        select: { id: true, promptVersion: true, status: true, updatedAt: true },
      });
      if (enrichment.status !== "completed" || enrichment.updatedAt.getTime() !== params.enrichmentUpdatedAt.getTime()) {
        return null;
      }
      const missionScoring = await tx.missionScoring.upsert({
        where: {
          missionId_missionEnrichmentId: {
            missionId: params.missionId,
            missionEnrichmentId: params.missionEnrichmentId,
          },
        },
        update: { updatedAt: new Date() },
        create: {
          missionId: params.missionId,
          missionEnrichmentId: params.missionEnrichmentId,
        },
      });

      // L'upsert verrouille le scoring avant tout remplacement de ses valeurs.
      await tx.missionScoringValue.deleteMany({
        where: { missionScoringId: missionScoring.id },
      });

      if (params.values.length > 0) {
        await tx.missionScoringValue.createMany({
          data: params.values.map((value) => ({
            ...value,
            missionScoringId: missionScoring.id,
          })) as Prisma.MissionScoringValueCreateManyInput[],
        });
      }

      await matchingCatalogRepository.publishScoring(tx, {
        id: missionScoring.id,
        missionId: params.missionId,
        missionEnrichmentId: enrichment.id,
        promptVersion: enrichment.promptVersion,
        values: params.values.map((value) => ({ taxonomyKey: value.taxonomyKey ?? null, valueKey: value.valueKey ?? null, score: value.score })),
      });
      return missionScoring;
    });
  },
};

export default missionScoringRepository;
