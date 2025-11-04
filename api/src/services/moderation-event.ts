import { Prisma } from "../db/core";
import { moderationEventRepository } from "../repositories/moderation-event";
import { ModerationEventParams, ModerationEventRecord } from "../types/moderation-event";

export const moderationEventService = {
  async findModerationEvents(params: ModerationEventParams = {}): Promise<ModerationEventRecord[]> {
    const findParams: Prisma.ModerationEventFindManyArgs = {
      where: {
        ...(params.missionId ? { missionId: params.missionId } : {}),
        ...(params.moderatorId ? { moderatorId: params.moderatorId } : {}),
      },
      orderBy: { createdAt: Prisma.SortOrder.asc },
    };

    if (params.take) {
      findParams.take = params.take;
    }

    if (params.skip) {
      findParams.skip = params.skip;
    }

    return await moderationEventRepository.find(findParams);
  },
};
