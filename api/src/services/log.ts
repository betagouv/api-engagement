import ModerationEventModel from "../models/moderation-event";
import { ModerationEvent } from "../types";

export const logModeration = async (previous: any, update: any, user: any, moderatorId: string) => {
  const data = {
    moderatorId,
    missionId: previous._id,
    userId: user._id.toString(),
    userName: user.firstname + " " + user.lastname,
    createdAt: new Date(),
    initialStatus: previous[`moderation_${moderatorId}_status`],
    newStatus: update[`moderation_${moderatorId}_status`],
    initialComment: previous[`moderation_${moderatorId}_comment`],
    newComment: update[`moderation_${moderatorId}_comment`],
    initialNote: previous[`moderation_${moderatorId}_note`],
    newNote: update[`moderation_${moderatorId}_note`],
    initialTitle: previous[`moderation_${moderatorId}_title`],
    newTitle: update[`moderation_${moderatorId}_title`],
    initialSiren: previous.associationSiren,
    newSiren: update.associationSiren,
    initialRNA: previous.associationRNA,
    newRNA: update.associationRNA,
  } as ModerationEvent;

  const obj = {
    moderatorId,
    missionId: data.missionId,
    userId: data.userId,
    userName: data.userName,
    createdAt: new Date(),
  } as ModerationEvent;

  if (data.newStatus && data.initialStatus !== data.newStatus) {
    obj.initialStatus = data.initialStatus;
    obj.newStatus = data.newStatus;
  }
  if (data.newTitle && data.initialTitle !== data.newTitle) {
    obj.initialTitle = data.initialTitle || previous.title;
    obj.newTitle = data.newTitle;
  }
  if (
    data.newComment &&
    (data.initialComment !== data.newComment || data.initialComment === null)
  ) {
    obj.initialComment = data.initialComment || null;
    obj.newComment = data.newComment;
  }
  if (data.newNote && (data.initialNote !== data.newNote || data.initialNote === null)) {
    obj.initialNote = data.initialNote || null;
    obj.newNote = data.newNote;
  }
  if (data.newSiren && (data.initialSiren !== data.newSiren || data.initialSiren === null)) {
    obj.initialSiren = data.initialSiren;
    obj.newSiren = data.newSiren;
  }
  if (data.newRNA && (data.initialRNA !== data.newRNA || data.initialRNA === null)) {
    obj.initialRNA = data.initialRNA;
    obj.newRNA = data.newRNA;
  }

  await ModerationEventModel.create(obj);
};
