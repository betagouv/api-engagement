import { MissionEnrichment, MissionEnrichmentValue, Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";

export const missionEnrichmentRepository = {
  findUnique<T extends Prisma.MissionEnrichmentFindUniqueArgs>(
    params: Prisma.SelectSubset<T, Prisma.MissionEnrichmentFindUniqueArgs>
  ): Promise<Prisma.MissionEnrichmentGetPayload<T> | null> {
    return prisma.missionEnrichment.findUnique(params) as Promise<Prisma.MissionEnrichmentGetPayload<T> | null>;
  },

  findFirst<T extends Prisma.MissionEnrichmentFindFirstArgs>(
    params: Prisma.SelectSubset<T, Prisma.MissionEnrichmentFindFirstArgs>
  ): Promise<Prisma.MissionEnrichmentGetPayload<T> | null> {
    return prisma.missionEnrichment.findFirst(params) as Promise<Prisma.MissionEnrichmentGetPayload<T> | null>;
  },

  upsert(params: Prisma.MissionEnrichmentUpsertArgs): Promise<MissionEnrichment> {
    return prisma.missionEnrichment.upsert(params);
  },

  update(params: Prisma.MissionEnrichmentUpdateArgs): Promise<MissionEnrichment> {
    return prisma.missionEnrichment.update(params);
  },

  deleteMany(params: Prisma.MissionEnrichmentDeleteManyArgs): Promise<Prisma.BatchPayload> {
    return prisma.missionEnrichment.deleteMany(params);
  },

  async completeWithValues(
    enrichmentId: string,
    rawResponse: string,
    tokenUsage: { inputTokens: number | undefined; outputTokens: number | undefined; totalTokens: number | undefined },
    values: Omit<Prisma.MissionEnrichmentValueUncheckedCreateInput, "enrichmentId">[]
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Delete existing values first — the enrichmentId may be reused across runs (upsert model),
      // so old classifications must be cleared before inserting the new ones.
      // MissionScoringValues that reference these are cascade-deleted automatically.
      await tx.missionEnrichmentValue.deleteMany({ where: { enrichmentId } });

      if (values.length > 0) {
        await tx.missionEnrichmentValue.createMany({
          data: values.map((value) => ({ ...value, enrichmentId })) as Prisma.MissionEnrichmentValueCreateManyInput[],
        });
      }
      await tx.missionEnrichment.update({
        where: { id: enrichmentId },
        data: {
          status: "completed",
          rawResponse,
          inputTokens: tokenUsage.inputTokens,
          outputTokens: tokenUsage.outputTokens,
          totalTokens: tokenUsage.totalTokens,
          completedAt: new Date(),
        },
      });
    });
  },
};

export const missionEnrichmentValueRepository = {
  findMany(params: Prisma.MissionEnrichmentValueFindManyArgs = {}): Promise<MissionEnrichmentValue[]> {
    return prisma.missionEnrichmentValue.findMany(params);
  },
};
