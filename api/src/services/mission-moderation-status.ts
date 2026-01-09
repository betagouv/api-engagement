import { Mission, MissionModerationStatus, ModerationEventStatus, Prisma } from "../db/core";
import { prismaCore } from "../db/postgres";
import { missionModerationStatusRepository } from "../repositories/mission-moderation-status";
import { MissionModerationRecord } from "../types/mission-moderation-status";

export type MissionModerationStatusUpdatePatch = Pick<Prisma.MissionModerationStatusCreateInput, "status" | "comment" | "note" | "title">;

type MissionModerationWithRelations = MissionModerationStatus & {
  mission: Mission & {
    domain: { name: string } | null;
    publisher: { name: string | null };
    addresses: { city: string | null; departmentCode: string | null; departmentName: string | null; postalCode: string | null }[];
    organization: { title: string } | null;
  };
};

const toRecord = (status: MissionModerationWithRelations): MissionModerationRecord => {
  const addresses = status.mission.addresses || [];
  const primaryAddress = addresses[0] ?? {};
  const organization = status.mission.organization;
  return {
    id: status.id,
    status: status.status,
    comment: status.comment,
    note: status.note,
    title: status.title,
    createdAt: status.createdAt,
    updatedAt: status.updatedAt,
    missionId: status.missionId,
    missionClientId: status.mission.clientId,
    missionTitle: status.mission.title,
    missionDomain: status.mission.domain?.name ?? null,
    missionDescription: status.mission.description,
    missionPublisherId: status.mission.publisherId,
    missionPublisherName: status.mission.publisher.name,
    missionStartAt: status.mission.startAt,
    missionEndAt: status.mission.endAt,
    missionPostedAt: status.mission.postedAt,
    missionCity: primaryAddress.city || null,
    missionDepartmentCode: primaryAddress.departmentCode || null,
    missionDepartmentName: primaryAddress.departmentName || null,
    missionPostalCode: primaryAddress.postalCode ?? null,
    missionOrganizationName: status.mission.organizationName ?? organization?.title ?? null,
    missionOrganizationClientId: status.mission.organizationClientId,
    missionApplicationUrl: status.mission.applicationUrl,
    missionOrganizationFullAddress: status.mission.organizationFullAddress,
    missionOrganizationId: status.mission.organizationId,
    missionOrganizationSirenVerified: status.mission.organizationSirenVerified,
    missionOrganizationRNAVerified: status.mission.organizationRNAVerified,
    missionOrganizationSiren: status.mission.organizationSiren,
    missionOrganizationRNA: status.mission.organizationRNA,
    missionOrganizationUrl: status.mission.organizationUrl,
  };
};

const baseInclude = {
  mission: {
    include: {
      domain: { select: { name: true } },
      publisher: { select: { name: true } },
      addresses: { select: { city: true, departmentCode: true, departmentName: true, postalCode: true } },
      organization: { select: { title: true } },
    },
  },
};

export const missionModerationStatusService = {
  async findOneMissionModerationStatus(id: string): Promise<MissionModerationRecord | null> {
    const status = await missionModerationStatusRepository.findUnique({ where: { id }, include: baseInclude });
    if (!status) {
      return null;
    }
    return toRecord(status as MissionModerationWithRelations);
  },

  async findModerationStatuses(filters: any) {
    const where: Prisma.MissionModerationStatusWhereInput = {
      mission: {
        deletedAt: null,
        statusCode: "ACCEPTED",
      },
    };

    if (filters.missionId) {
      where.missionId = filters.missionId;
    }

    if (filters.publisherId) {
      where.publisherId = filters.publisherId;
    }

    const [data, total] = await Promise.all([
      missionModerationStatusRepository.findMany({
        where,
        include: baseInclude,
        orderBy: { createdAt: Prisma.SortOrder.desc },
        skip: filters.skip ?? 0,
        take: filters.limit ?? 25,
      }),
      prismaCore.missionModerationStatus.count({ where }),
    ]);

    return { data: data.map((status) => toRecord(status as MissionModerationWithRelations)), total };
  },

  async update(id: string, patch: MissionModerationStatusUpdatePatch) {
    const updates: Prisma.MissionModerationStatusUpdateInput = {};
    if ("status" in patch) {
      updates.status = patch.status ?? null;
    }
    if ("comment" in patch) {
      updates.comment = patch.comment ?? null;
    }
    if ("note" in patch) {
      updates.note = patch.note ?? null;
    }
    if ("title" in patch) {
      updates.title = patch.title ?? null;
    }
    const res = await missionModerationStatusRepository.update({ where: { id }, data: updates, include: baseInclude });
    return toRecord(res as MissionModerationWithRelations);
  },

  async upsertStatuses(inputs: Array<{ missionId: string; publisherId: string; status: string | null; comment: string | null; note: string | null; title?: string | null }>) {
    if (!inputs.length) {
      return [];
    }
    return prismaCore.$transaction(
      inputs.map((input) =>
        prismaCore.missionModerationStatus.upsert({
          where: { missionId_publisherId: { missionId: input.missionId, publisherId: input.publisherId } },
          update: {
            status: (input.status as ModerationEventStatus | null) ?? null,
            comment: input.comment ?? null,
            note: input.note ?? null,
            title: input.title ?? null,
          },
          create: {
            mission: { connect: { id: input.missionId } },
            publisherId: input.publisherId,
            status: (input.status as ModerationEventStatus | null) ?? null,
            comment: input.comment ?? null,
            note: input.note ?? null,
            title: input.title ?? null,
          },
        })
      )
    );
  },
};

export default missionModerationStatusService;
