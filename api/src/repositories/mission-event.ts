import { MissionEvent, Prisma } from "../db/core";
import { prisma } from "../db/postgres";

export const missionEventRepository = {
  async create(data: Prisma.MissionEventUncheckedCreateInput): Promise<MissionEvent> {
    return prisma.missionEvent.create({ data });
  },

  async createMany(data: Prisma.MissionEventCreateManyInput[]): Promise<Prisma.BatchPayload> {
    return prisma.missionEvent.createMany({ data });
  },
};

export default missionEventRepository;
