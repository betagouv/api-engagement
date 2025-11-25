import { Prisma } from "../db/core";
import { moderationEventRepository } from "../repositories/moderation-event";
import { Mission } from "../types";
import { ModerationEventCreateInput, ModerationEventParams, ModerationEventRecord } from "../types/moderation-event";
import type { UserRecord } from "../types/user";

const buildWhereClause = (params: ModerationEventParams): Prisma.ModerationEventWhereInput => {
  return {
    ...(params.missionId ? { missionId: params.missionId } : {}),
    ...(params.moderatorId ? { moderatorId: params.moderatorId } : {}),
  };
};

const buildInput = (input: ModerationEventCreateInput): Prisma.ModerationEventCreateInput => {
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

  return data;
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
    const data = buildInput(input);

    return await moderationEventRepository.create(data);
  },

  async createModerationEvents(inputs: ModerationEventCreateInput[]): Promise<number> {
    if (inputs.length === 0) {
      return 0;
    }

    const data: Prisma.ModerationEventCreateManyInput[] = inputs.map(buildInput);

    const { count } = await moderationEventRepository.createMany(data);
    return count;
  },

  buildModerationEventPayload(previous: Mission, update: Mission, user: UserRecord, moderatorId: string): ModerationEventCreateInput {
    const data = {
      moderatorId,
      missionId: previous._id.toString(),
      userId: user.id,
      userName: user.firstname + " " + user.lastname,
      initialStatus: previous[`moderation_${moderatorId}_status`],
      newStatus: update[`moderation_${moderatorId}_status`],
      initialComment: previous[`moderation_${moderatorId}_comment`],
      newComment: update[`moderation_${moderatorId}_comment`],
      initialNote: previous[`moderation_${moderatorId}_note`],
      newNote: update[`moderation_${moderatorId}_note`],
      initialTitle: previous[`moderation_${moderatorId}_title`],
      newTitle: update[`moderation_${moderatorId}_title`],
      initialSiren: previous.organizationSirenVerified,
      newSiren: update.organizationSirenVerified,
      initialRNA: previous.organizationRNAVerified,
      newRNA: update.organizationRNAVerified,
    } as ModerationEventCreateInput;

    const obj: ModerationEventCreateInput = {
      moderatorId,
      missionId: data.missionId,
      userId: data.userId,
      userName: data.userName,
    };

    if (data.newStatus && data.initialStatus !== data.newStatus) {
      obj.initialStatus = data.initialStatus ?? null;
      obj.newStatus = data.newStatus;
    }
    if (data.newTitle && data.initialTitle !== data.newTitle) {
      obj.initialTitle = data.initialTitle || previous.title;
      obj.newTitle = data.newTitle;
    }
    if (data.newComment && (data.initialComment !== data.newComment || data.initialComment === null)) {
      obj.initialComment = data.initialComment || null;
      obj.newComment = data.newComment;
    }
    if (data.newNote && (data.initialNote !== data.newNote || data.initialNote === null)) {
      obj.initialNote = data.initialNote || null;
      obj.newNote = data.newNote;
    }
    if (data.newSiren && (data.initialSiren !== data.newSiren || data.initialSiren === null)) {
      obj.initialSiren = data.initialSiren ?? null;
      obj.newSiren = data.newSiren;
    }
    if (data.newRNA && (data.initialRNA !== data.newRNA || data.initialRNA === null)) {
      obj.initialRNA = data.initialRNA ?? null;
      obj.newRNA = data.newRNA;
    }

    return obj;
  },
};
