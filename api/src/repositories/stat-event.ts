import { Prisma, StatEvent } from "../db/core";
import { prismaCore } from "../db/postgres";

export const statEventRepository = {
  async findMany(params: Prisma.StatEventFindManyArgs = {}): Promise<StatEvent[]> {
    return prismaCore.statEvent.findMany(params);
  },

  async findFirst(params: Prisma.StatEventFindFirstArgs): Promise<StatEvent | null> {
    return prismaCore.statEvent.findFirst(params);
  },

  async findUnique(params: Prisma.StatEventFindUniqueArgs): Promise<StatEvent | null> {
    return prismaCore.statEvent.findUnique(params);
  },

  async count(params: Prisma.StatEventCountArgs = {}): Promise<number> {
    return prismaCore.statEvent.count(params);
  },

  async create(params: Prisma.StatEventCreateArgs): Promise<StatEvent> {
    return prismaCore.statEvent.create(params);
  },

  async update(params: Prisma.StatEventUpdateArgs): Promise<StatEvent> {
    return prismaCore.statEvent.update(params);
  },

  async updateMany(params: Prisma.StatEventUpdateManyArgs): Promise<Prisma.BatchPayload> {
    return prismaCore.statEvent.updateMany(params);
  },

  async groupBy(params: Prisma.StatEventGroupByArgs): Promise<Prisma.GetStatEventGroupByPayload<typeof params>> {
    return prismaCore.statEvent.groupBy(params);
  },
};

export default statEventRepository;
