import { Prisma, StatBot } from "../db/core";
import { prisma } from "../db/postgres";

export const statBotRepository = {
  async findMany(params: Prisma.StatBotFindManyArgs = {}): Promise<StatBot[]> {
    return prisma.statBot.findMany(params);
  },

  async findFirst(params: Prisma.StatBotFindFirstArgs): Promise<StatBot | null> {
    return prisma.statBot.findFirst(params);
  },

  async findUnique(params: Prisma.StatBotFindUniqueArgs): Promise<StatBot | null> {
    return prisma.statBot.findUnique(params);
  },

  async count(params: Prisma.StatBotCountArgs = {}): Promise<number> {
    return prisma.statBot.count(params);
  },

  async create(params: Prisma.StatBotCreateArgs): Promise<StatBot> {
    return prisma.statBot.create(params);
  },

  async update(params: Prisma.StatBotUpdateArgs): Promise<StatBot> {
    return prisma.statBot.update(params);
  },

  async deleteMany(params: Prisma.StatBotDeleteManyArgs): Promise<Prisma.BatchPayload> {
    return prisma.statBot.deleteMany(params);
  },
};
