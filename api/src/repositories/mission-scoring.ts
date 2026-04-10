import { MissionScoring, Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";

export const missionScoringRepository = {
  async findUnique<T extends Prisma.MissionScoringFindUniqueArgs>(
    params: Prisma.SelectSubset<T, Prisma.MissionScoringFindUniqueArgs>
  ): Promise<Prisma.MissionScoringGetPayload<T> | null> {
    return prisma.missionScoring.findUnique(params) as Promise<Prisma.MissionScoringGetPayload<T> | null>;
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
