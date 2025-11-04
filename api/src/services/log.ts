import { ModerationEventCreateInput } from "../types/moderation-event";
import { moderationEventService } from "./moderation-event";

export const logModeration = async (previous: any, update: any, user: any, moderatorId: string) => {
  const data = {
    moderatorId,
    missionId: previous._id,
    userId: user._id.toString(),
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

  await moderationEventService.createModerationEvent(obj);
};
