import { Prisma, StatBot } from "@/db/core";
import { prismaCore } from "@/db/postgres";

export const statBotRepository = {
  async findMany(params: Prisma.StatBotFindManyArgs = {}): Promise<StatBot[]> {
    return prismaCore.statBot.findMany(params);
  },

  async findFirst(params: Prisma.StatBotFindFirstArgs): Promise<StatBot | null> {
    return prismaCore.statBot.findFirst(params);
  },

  async findUnique(params: Prisma.StatBotFindUniqueArgs): Promise<StatBot | null> {
    return prismaCore.statBot.findUnique(params);
  },

  async count(params: Prisma.StatBotCountArgs = {}): Promise<number> {
    return prismaCore.statBot.count(params);
  },

  async create(params: Prisma.StatBotCreateArgs): Promise<StatBot> {
    return prismaCore.statBot.create(params);
  },

  async update(params: Prisma.StatBotUpdateArgs): Promise<StatBot> {
    return prismaCore.statBot.update(params);
  },

  async deleteMany(params: Prisma.StatBotDeleteManyArgs): Promise<Prisma.BatchPayload> {
    return prismaCore.statBot.deleteMany(params);
  },
};
