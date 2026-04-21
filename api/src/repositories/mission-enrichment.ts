import { MissionEnrichment, MissionEnrichmentValue, Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";

export const missionEnrichmentRepository = {
  create(params: Prisma.MissionEnrichmentCreateArgs): Promise<MissionEnrichment> {
    return prisma.missionEnrichment.create(params);
  },

  findFirst<T extends Prisma.MissionEnrichmentFindFirstArgs>(
    params: Prisma.SelectSubset<T, Prisma.MissionEnrichmentFindFirstArgs>
  ): Promise<Prisma.MissionEnrichmentGetPayload<T> | null> {
    return prisma.missionEnrichment.findFirst(params) as Promise<Prisma.MissionEnrichmentGetPayload<T> | null>;
  },

  update(params: Prisma.MissionEnrichmentUpdateArgs): Promise<MissionEnrichment> {
    return prisma.missionEnrichment.update(params);
  },

  async completeWithValues(
    enrichmentId: string,
    rawResponse: string,
    tokenUsage: { inputTokens: number | undefined; outputTokens: number | undefined; totalTokens: number | undefined },
    values: Omit<Prisma.MissionEnrichmentValueUncheckedCreateInput, "enrichmentId">[]
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      if (values.length > 0) {
        await tx.missionEnrichmentValue.createMany({
          data: values.map((v) => ({ ...v, enrichmentId })),
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
