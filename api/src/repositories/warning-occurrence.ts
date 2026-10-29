import { Prisma, WarningOccurrence } from "@/db/core";
import { prisma } from "@/db/postgres";

export const warningOccurrenceRepository = {
  async findMany(params: Prisma.WarningOccurrenceFindManyArgs): Promise<WarningOccurrence[]> {
    return prisma.warningOccurrence.findMany(params);
  },
};
