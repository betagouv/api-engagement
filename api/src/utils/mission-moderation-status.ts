import { MissionModerationStatusUpdatePatch } from "../services/mission-moderation-status";
import { MissionRecord, MissionUpdatePatch } from "../types/mission";
import { MissionModerationRecord } from "../types/mission-moderation-status";
import { ModerationEventCreateInput, ModerationEventStatus } from "../types/moderation-event";

type ModerationUpdateBody = {
  status?: string;
  comment?: string | null;
  note?: string | null;
  title?: string | null;
  missionOrganizationRNAVerified?: string | null;
  missionOrganizationSirenVerified?: string | null;
  missionOrganizationName?: string | null;
};

export const getModerationUpdates = (body: ModerationUpdateBody): MissionModerationStatusUpdatePatch | null => {
  const updates: Partial<MissionModerationStatusUpdatePatch> = {};
  if (body.status) {
    updates.status = body.status as MissionModerationStatusUpdatePatch["status"];
  }
  if (body.comment) {
    updates.comment = body.comment;
  }
  if (body.note) {
    updates.note = body.note;
  }
  if (body.title) {
    updates.title = body.title;
  }
  if (Object.keys(updates).length) {
    return updates as MissionModerationStatusUpdatePatch;
  }
  return null;
};

export const getMissionUpdates = (body: ModerationUpdateBody, previous: MissionModerationRecord): MissionUpdatePatch | null => {
  const updates: Partial<MissionUpdatePatch> = {};
  if (body.missionOrganizationRNAVerified !== undefined && body.missionOrganizationRNAVerified !== previous.missionOrganizationRNAVerified) {
    updates.organizationRNAVerified = body.missionOrganizationRNAVerified;
  }
  if (body.missionOrganizationSirenVerified !== undefined && body.missionOrganizationSirenVerified !== previous.missionOrganizationSirenVerified) {
    updates.organizationSirenVerified = body.missionOrganizationSirenVerified;
  }
  if (body.missionOrganizationName !== undefined && body.missionOrganizationName !== previous.missionOrganizationName) {
    updates.organizationName = body.missionOrganizationName;
  }
  if (Object.keys(updates).length) {
    return updates as MissionUpdatePatch;
  }
  return null;
};

export const getModerationEvents = (
  previous: MissionModerationRecord,
  updated: MissionModerationRecord,
  missionUpdated: MissionRecord | null
): Omit<ModerationEventCreateInput, "moderatorId">[] => {
  const events: Omit<ModerationEventCreateInput, "moderatorId">[] = [];

  if (previous.status !== updated.status) {
    events.push({
      missionId: previous.missionId,
      initialStatus: previous.status as ModerationEventStatus | null,
      newStatus: updated.status as ModerationEventStatus | null,
    });
  }

  if (previous.comment !== updated.comment) {
    events.push({
      missionId: previous.missionId,
      initialComment: previous.comment ?? null,
      newComment: updated.comment,
    });
  }

  if (previous.title !== updated.title) {
    events.push({
      missionId: previous.missionId,
      initialTitle: previous.title ?? null,
      newTitle: updated.title,
    });
  }

  if (previous.note !== updated.note) {
    events.push({
      missionId: previous.missionId,
      initialNote: previous.note ?? null,
      newNote: updated.note,
    });
  }

  if (missionUpdated && previous.missionOrganizationSirenVerified !== missionUpdated.organizationSirenVerified) {
    events.push({
      missionId: missionUpdated.id,
      initialSiren: previous.missionOrganizationSirenVerified ?? null,
      newSiren: missionUpdated.organizationSirenVerified ?? null,
    });
  }

  if (missionUpdated && previous.missionOrganizationRNAVerified !== missionUpdated.organizationRNAVerified) {
    events.push({
      missionId: missionUpdated.id,
      initialRNA: previous.missionOrganizationRNAVerified ?? null,
      newRNA: missionUpdated.organizationRNAVerified ?? null,
    });
  }

  return events.map((event) => ({
    missionId: event.missionId,
    initialStatus: event.initialStatus ?? null,
    newStatus: event.newStatus ?? null,
    initialComment: event.initialComment ?? null,
    newComment: event.newComment ?? null,
    initialNote: event.initialNote ?? null,
    newNote: event.newNote ?? null,
    initialTitle: event.initialTitle ?? null,
    newTitle: event.newTitle ?? null,
    initialSiren: event.initialSiren ?? null,
    newSiren: event.newSiren ?? null,
    initialRNA: event.initialRNA ?? null,
    newRNA: event.newRNA ?? null,
  }));
};
