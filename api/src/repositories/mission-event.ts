import { MissionEvent, Prisma } from "../db/core";
import { prismaCore } from "../db/postgres";

export const missionEventRepository = {
  async create(data: Prisma.MissionEventUncheckedCreateInput): Promise<MissionEvent> {
    return prismaCore.missionEvent.create({ data });
  },

  async createMany(data: Prisma.MissionEventCreateManyInput[]): Promise<Prisma.BatchPayload> {
    return prismaCore.missionEvent.createMany({ data });
  },
};

export default missionEventRepository;
