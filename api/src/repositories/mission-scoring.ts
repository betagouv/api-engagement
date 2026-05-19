import { MissionScoring, Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";

export const missionScoringRepository = {
  async findUnique(params: Prisma.MissionScoringFindUniqueArgs): Promise<MissionScoring | null> {
    return prisma.missionScoring.findUnique(params);
  },

  async findMany<T extends Prisma.MissionScoringFindManyArgs>(
    params: Prisma.SelectSubset<T, Prisma.MissionScoringFindManyArgs>
  ): Promise<Prisma.MissionScoringGetPayload<T>[]> {
    return prisma.missionScoring.findMany(params) as Promise<Prisma.MissionScoringGetPayload<T>[]>;
  },

  async count(params: Prisma.MissionScoringCountArgs = {}): Promise<number> {
    return prisma.missionScoring.count(params);
  },

  async deleteMany(params: Prisma.MissionScoringDeleteManyArgs): Promise<Prisma.BatchPayload> {
    return prisma.missionScoring.deleteMany(params);
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
          })) as Prisma.MissionScoringValueCreateManyInput[],
        });
      }

      return missionScoring;
    });
  },
};

export default missionScoringRepository;
