import { MissionEnrichment, MissionEnrichmentValue, Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";

export const missionEnrichmentRepository = {
  create(params: Prisma.MissionEnrichmentCreateArgs): Promise<MissionEnrichment> {
    return prisma.missionEnrichment.create(params);
  },

  findFirst(params: Prisma.MissionEnrichmentFindFirstArgs): Promise<MissionEnrichment | null> {
    return prisma.missionEnrichment.findFirst(params);
  },

  update(params: Prisma.MissionEnrichmentUpdateArgs): Promise<MissionEnrichment> {
    return prisma.missionEnrichment.update(params);
  },

  async completeWithValues(enrichmentId: string, rawResponse: string, values: Omit<Prisma.MissionEnrichmentValueUncheckedCreateInput, "enrichmentId">[]): Promise<void> {
    await prisma.$transaction(async (tx) => {
      if (values.length > 0) {
        await tx.missionEnrichmentValue.createMany({
          data: values.map((v) => ({ ...v, enrichmentId })),
        });
      }
      await tx.missionEnrichment.update({
        where: { id: enrichmentId },
        data: { status: "completed", rawResponse, completedAt: new Date() },
      });
    });
  },
};

export const missionEnrichmentValueRepository = {
  findMany(params: Prisma.MissionEnrichmentValueFindManyArgs = {}): Promise<MissionEnrichmentValue[]> {
    return prisma.missionEnrichmentValue.findMany(params);
  },
};
