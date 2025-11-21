import { MissionEvent, Prisma } from "../db/core";
import { prismaCore } from "../db/postgres";

export const missionEventRepository = {
  async create(data: Prisma.MissionEventCreateInput): Promise<MissionEvent> {
    return prismaCore.missionEvent.create({ data });
  },

  async createMany(data: Prisma.MissionEventCreateInput[]): Promise<Prisma.BatchPayload> {
    return prismaCore.missionEvent.createMany({ data });
  },
};

export default missionEventRepository;
