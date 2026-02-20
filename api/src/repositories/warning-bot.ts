import { Prisma, WarningBot } from "@/db/core";
import { prismaCore } from "@/db/postgres";

export const warningBotRepository = {
  async findMany(params: Prisma.WarningBotFindManyArgs = {}): Promise<WarningBot[]> {
    return prismaCore.warningBot.findMany(params);
  },

  async findFirst(params: Prisma.WarningBotFindFirstArgs): Promise<WarningBot | null> {
    return prismaCore.warningBot.findFirst(params);
  },

  async findUnique(params: Prisma.WarningBotFindUniqueArgs): Promise<WarningBot | null> {
    return prismaCore.warningBot.findUnique(params);
  },

  async create(params: Prisma.WarningBotCreateArgs): Promise<WarningBot> {
    return prismaCore.warningBot.create(params);
  },

  async update(params: Prisma.WarningBotUpdateArgs): Promise<WarningBot> {
    return prismaCore.warningBot.update(params);
  },
};
