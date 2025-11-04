import { Prisma } from "../db/core";
import { moderationEventRepository } from "../repositories/moderation-event";
import { ModerationEventCreateInput, ModerationEventParams, ModerationEventRecord } from "../types/moderation-event";

const buildWhereClause = (params: ModerationEventParams): Prisma.ModerationEventWhereInput => {
  return {
    ...(params.missionId ? { missionId: params.missionId } : {}),
    ...(params.moderatorId ? { moderatorId: params.moderatorId } : {}),
  };
};

export const moderationEventService = {
  async findModerationEvents(params: ModerationEventParams = {}): Promise<ModerationEventRecord[]> {
    const findParams: Prisma.ModerationEventFindManyArgs = {
      where: buildWhereClause(params),
      orderBy: { createdAt: Prisma.SortOrder.asc },
    };

    if (typeof params.take === "number") {
      findParams.take = params.take;
    }

    if (typeof params.skip === "number") {
      findParams.skip = params.skip;
    }

    return await moderationEventRepository.find(findParams);
  },

  async createModerationEvent(input: ModerationEventCreateInput): Promise<ModerationEventRecord> {
    const data: Prisma.ModerationEventCreateInput = {
      missionId: input.missionId,
      moderatorId: input.moderatorId,
      userId: input.userId ?? null,
      userName: input.userName ?? null,
      initialStatus: input.initialStatus ?? null,
      newStatus: input.newStatus ?? null,
      initialComment: input.initialComment ?? null,
      newComment: input.newComment ?? null,
      initialNote: input.initialNote ?? null,
      newNote: input.newNote ?? null,
      initialTitle: input.initialTitle ?? null,
      newTitle: input.newTitle ?? null,
      initialSiren: input.initialSiren ?? null,
      newSiren: input.newSiren ?? null,
      initialRNA: input.initialRNA ?? null,
      newRNA: input.newRNA ?? null,
    };

    return await moderationEventRepository.create(data);
  },
};
