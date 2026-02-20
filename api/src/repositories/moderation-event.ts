import { ModerationEvent, Prisma } from "../db/core";
import { prisma } from "../db/postgres";

export const moderationEventRepository = {
  async find(params: Prisma.ModerationEventFindManyArgs = {}): Promise<ModerationEvent[]> {
    return prisma.moderationEvent.findMany(params);
  },

  async create(data: Prisma.ModerationEventUncheckedCreateInput): Promise<ModerationEvent> {
    return prisma.moderationEvent.create({ data });
  },

  async createMany(data: Prisma.ModerationEventCreateManyInput[]): Promise<Prisma.BatchPayload> {
    return prisma.moderationEvent.createMany({ data });
  },

  async update(id: string, data: Prisma.ModerationEventUpdateInput): Promise<ModerationEvent> {
    return prisma.moderationEvent.update({ where: { id }, data });
  },
};
