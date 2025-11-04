import { ModerationEvent, Prisma } from "../db/core";
import { prismaCore } from "../db/postgres";

export const moderationEventRepository = {
  async find(params: Prisma.ModerationEventFindManyArgs = {}): Promise<ModerationEvent[]> {
    return prismaCore.moderationEvent.findMany(params);
  },

  async create(data: Prisma.ModerationEventCreateInput): Promise<ModerationEvent> {
    return prismaCore.moderationEvent.create({ data });
  },

  async createMany(data: Prisma.ModerationEventCreateManyInput[]): Promise<Prisma.BatchPayload> {
    return prismaCore.moderationEvent.createMany({ data });
  },
};
