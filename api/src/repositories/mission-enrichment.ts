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

  async completeWithValuesAndDeletePrevious(
    params: {
      enrichmentId: string;
      missionId: string;
      promptVersion: string;
      rawResponse: string;
      tokenUsage: { inputTokens: number | undefined; outputTokens: number | undefined; totalTokens: number | undefined };
      values: Omit<Prisma.MissionEnrichmentValueUncheckedCreateInput, "enrichmentId">[];
    }
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      if (params.values.length > 0) {
        await tx.missionEnrichmentValue.createMany({
          data: params.values.map((v) => ({ ...v, enrichmentId: params.enrichmentId })),
        });
      }

      await tx.missionEnrichment.update({
        where: { id: params.enrichmentId },
        data: {
          status: "completed",
          rawResponse: params.rawResponse,
          inputTokens: params.tokenUsage.inputTokens,
          outputTokens: params.tokenUsage.outputTokens,
          totalTokens: params.tokenUsage.totalTokens,
          completedAt: new Date(),
        },
      });

      await tx.missionEnrichment.deleteMany({
        where: {
          missionId: params.missionId,
          promptVersion: params.promptVersion,
          id: { not: params.enrichmentId },
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
