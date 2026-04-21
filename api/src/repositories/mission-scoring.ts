import { MissionScoring, Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";

export const missionScoringRepository = {
  async findUnique(params: Prisma.MissionScoringFindUniqueArgs): Promise<MissionScoring | null> {
    return prisma.missionScoring.findUnique(params);
  },

  async replaceForEnrichment(params: {
    missionId: string;
    missionEnrichmentId: string;
    values: Omit<Prisma.MissionScoringValueUncheckedCreateInput, "missionScoringId">[];
  }): Promise<MissionScoring> {
    return prisma.$transaction(async (tx) => {
      const missionScoring = await tx.missionScoring.upsert({
        where: {
          missionId_missionEnrichmentId: {
            missionId: params.missionId,
            missionEnrichmentId: params.missionEnrichmentId,
          },
        },
        update: {},
        create: {
          missionId: params.missionId,
          missionEnrichmentId: params.missionEnrichmentId,
        },
      });

      await tx.missionScoringValue.deleteMany({
        where: { missionScoringId: missionScoring.id },
      });

      if (params.values.length > 0) {
        await tx.missionScoringValue.createMany({
          data: params.values.map((value) => ({
            ...value,
            missionScoringId: missionScoring.id,
          })),
        });
      }

      return missionScoring;
    });
  },
};

export default missionScoringRepository;
