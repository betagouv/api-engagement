import { Prisma, WarningBot } from "../db/core";
import { prisma } from "../db/postgres";

export const warningBotRepository = {
  async findMany(params: Prisma.WarningBotFindManyArgs = {}): Promise<WarningBot[]> {
    return prisma.warningBot.findMany(params);
  },

  async findFirst(params: Prisma.WarningBotFindFirstArgs): Promise<WarningBot | null> {
    return prisma.warningBot.findFirst(params);
  },

  async findUnique(params: Prisma.WarningBotFindUniqueArgs): Promise<WarningBot | null> {
    return prisma.warningBot.findUnique(params);
  },

  async create(params: Prisma.WarningBotCreateArgs): Promise<WarningBot> {
    return prisma.warningBot.create(params);
  },

  async update(params: Prisma.WarningBotUpdateArgs): Promise<WarningBot> {
    return prisma.warningBot.update(params);
  },
};
