import { Prisma, PublisherOrganization } from "../db/core";
import { MissionModerationStatusUpdatePatch } from "../services/mission-moderation-status";
import { MissionModerationRecord, ModerationFilters } from "../types/mission-moderation-status";
import { ModerationEventCreateInput, ModerationEventStatus } from "../types/moderation-event";

type ModerationUpdateBody = {
  status?: string;
  comment?: string | null;
  note?: string | null;
  title?: string | null;
  missionOrganizationRNAVerified?: string | null;
  missionOrganizationSirenVerified?: string | null;
};

export const buildWhere = (filters: ModerationFilters): { where: Prisma.MissionModerationStatusWhereInput; missionWhere: Prisma.MissionWhereInput } => {
  const missionWhere: Prisma.MissionWhereInput = {
    deletedAt: null,
    statusCode: "ACCEPTED",
  };
  const where: Prisma.MissionModerationStatusWhereInput = { mission: { deletedAt: null, statusCode: "ACCEPTED" } };

  if (filters.moderatorId) {
    where.publisherId = filters.moderatorId;
    missionWhere.moderationStatuses = { some: { publisherId: filters.moderatorId } };
  }

  if (filters.missionId) {
    where.missionId = filters.missionId;
    missionWhere.id = filters.missionId;
  }

  if (filters.status) {
    where.status = filters.status as ModerationEventStatus;
    missionWhere.moderationStatuses = { some: { status: filters.status as ModerationEventStatus } };
  }

  if (filters.comment) {
    where.comment = filters.comment;
    missionWhere.moderationStatuses = { some: { comment: filters.comment } };
  }

  if (filters.publisherId) {
    where.mission!.publisherId = filters.publisherId;
    missionWhere.publisherId = filters.publisherId;
  }

  if (filters.domain) {
    if (filters.domain === "none") {
      where.mission!.domain = null;
      missionWhere.domain = null;
    } else {
      where.mission!.domain = { name: filters.domain };
      missionWhere.domain = { name: filters.domain };
    }
  }

  if (filters.department) {
    if (filters.department === "none") {
      where.mission!.addresses = { some: { departmentCode: null } };
      missionWhere.addresses = { some: { departmentCode: null } };
    } else {
      where.mission!.addresses = { some: { departmentCode: filters.department } };
      missionWhere.addresses = { some: { departmentCode: filters.department } };
    }
  }

  if (filters.organizationName) {
    if (filters.organizationName === "none") {
      where.mission!.publisherOrganization = null;
      missionWhere.publisherOrganization = null;
    } else {
      where.mission!.publisherOrganization = { is: { organizationName: filters.organizationName } } as Prisma.PublisherOrganizationWhereInput;
      missionWhere.publisherOrganization = { is: { organizationName: filters.organizationName } } as Prisma.PublisherOrganizationWhereInput;
    }
  }

  if (filters.city) {
    if (filters.city === "none") {
      where.mission!.addresses = { ...missionWhere.addresses, some: { ...((missionWhere.addresses as any)?.some || {}), city: null } };
      missionWhere.addresses = { ...missionWhere.addresses, some: { ...((missionWhere.addresses as any)?.some || {}), city: null } };
    } else {
      where.mission!.addresses = { ...missionWhere.addresses, some: { ...((missionWhere.addresses as any)?.some || {}), city: filters.city } };
      missionWhere.addresses = { ...missionWhere.addresses, some: { ...((missionWhere.addresses as any)?.some || {}), city: filters.city } };
    }
  }

  if (filters.activity) {
    if (filters.activity === "none") {
      where.mission!.activity = null;
      missionWhere.activity = null;
    } else {
      where.mission!.activity = { name: filters.activity };
      missionWhere.activity = { name: filters.activity };
    }
  }

  if (filters.search) {
    where.mission!.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { publisherOrganization: { is: { organizationName: { contains: filters.search, mode: "insensitive" } } } },
    ];
    missionWhere.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { publisherOrganization: { is: { organizationName: { contains: filters.search, mode: "insensitive" } } } },
    ];
  }

  return { where, missionWhere };
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

export const getOrganizationUpdates = (body: ModerationUpdateBody, previous: MissionModerationRecord): Prisma.PublisherOrganizationUpdateInput | null => {
  const updates: Partial<Prisma.PublisherOrganizationUpdateInput> = {};
  if (body.missionOrganizationRNAVerified !== undefined && body.missionOrganizationRNAVerified !== previous.missionOrganizationRNAVerified) {
    updates.organizationRNAVerified = body.missionOrganizationRNAVerified;
  }
  if (body.missionOrganizationSirenVerified !== undefined && body.missionOrganizationSirenVerified !== previous.missionOrganizationSirenVerified) {
    updates.organizationSirenVerified = body.missionOrganizationSirenVerified;
  }
  if (Object.keys(updates).length) {
    return updates as Prisma.PublisherOrganizationUpdateInput;
  }
  return null;
};

export const getModerationEvents = (
  previous: MissionModerationRecord,
  updated: MissionModerationRecord,
  organizationUpdated: PublisherOrganization | null
): Omit<ModerationEventCreateInput, "moderatorId">[] => {
  const events: Omit<ModerationEventCreateInput, "moderatorId">[] = [];

  if (previous.status !== updated.status) {
    events.push({
      missionId: previous.missionId,
      initialStatus: previous.status as ModerationEventStatus | null,
      newStatus: updated.status as ModerationEventStatus | null,
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

  if (organizationUpdated && previous.missionOrganizationSirenVerified !== organizationUpdated.organizationSirenVerified) {
    events.push({
      missionId: organizationUpdated.id,
      initialSiren: previous.missionOrganizationSirenVerified ?? null,
      newSiren: organizationUpdated.organizationSirenVerified ?? null,
    });
  }

  if (organizationUpdated && previous.missionOrganizationRNAVerified !== organizationUpdated.organizationRNAVerified) {
    events.push({
      missionId: organizationUpdated.id,
      initialRNA: previous.missionOrganizationRNAVerified ?? null,
      newRNA: organizationUpdated.organizationRNAVerified ?? null,
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
