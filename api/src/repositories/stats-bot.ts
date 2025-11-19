import { Prisma, StatsBot } from "../db/core";
import { prismaCore } from "../db/postgres";

export const statsBotRepository = {
  async findMany(params: Prisma.StatsBotFindManyArgs = {}): Promise<StatsBot[]> {
    return prismaCore.statsBot.findMany(params);
  },

  async findFirst(params: Prisma.StatsBotFindFirstArgs): Promise<StatsBot | null> {
    return prismaCore.statsBot.findFirst(params);
  },

  async findUnique(params: Prisma.StatsBotFindUniqueArgs): Promise<StatsBot | null> {
    return prismaCore.statsBot.findUnique(params);
  },

  async count(params: Prisma.StatsBotCountArgs = {}): Promise<number> {
    return prismaCore.statsBot.count(params);
  },

  async create(params: Prisma.StatsBotCreateArgs): Promise<StatsBot> {
    return prismaCore.statsBot.create(params);
  },

  async update(params: Prisma.StatsBotUpdateArgs): Promise<StatsBot> {
    return prismaCore.statsBot.update(params);
  },

  async deleteMany(params: Prisma.StatsBotDeleteManyArgs): Promise<Prisma.BatchPayload> {
    return prismaCore.statsBot.deleteMany(params);
  },
};
