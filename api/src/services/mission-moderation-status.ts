import { Mission, MissionModerationStatus, ModerationEventStatus, Prisma } from "../db/core";
import { prismaCore } from "../db/postgres";
import { activityRepository } from "../repositories/activity";
import { domainRepository } from "../repositories/domain";
import { missionRepository } from "../repositories/mission";
import { missionAddressRepository } from "../repositories/mission-address";
import { missionModerationStatusRepository } from "../repositories/mission-moderation-status";
import { publisherRepository } from "../repositories/publisher";
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

type ModerationFilters = {
  moderatorId?: string;
  publisherId?: string;
  missionId?: string;
  status?: string;
  comment?: string;
  domain?: string;
  department?: string;
  organizationName?: string;
  city?: string;
  activity?: string;
  search?: string;
};

type AggregationItem = { key: string; doc_count: number; label?: string };

const toAggItems = <T>(results: T[], keyGetter: (item: T) => string | null, countGetter: (item: T) => number): AggregationItem[] =>
  results.map((item) => ({ key: keyGetter(item) ?? "", doc_count: countGetter(item) })).sort((a, b) => b.doc_count - a.doc_count);

const buildWhere = (filters: ModerationFilters): Prisma.MissionModerationStatusWhereInput => {
  const missionWhere: Prisma.MissionWhereInput = {
    deletedAt: null,
    statusCode: "ACCEPTED",
  };
  const where: Prisma.MissionModerationStatusWhereInput = {};

  if (filters.moderatorId) {
    where.publisherId = filters.moderatorId;
  }

  if (filters.missionId) {
    where.missionId = filters.missionId;
  }

  if (filters.status) {
    where.status = filters.status as ModerationEventStatus;
  }

  if (filters.comment) {
    where.comment = filters.comment;
  }

  if (filters.publisherId) {
    missionWhere.publisherId = filters.publisherId;
  }

  if (filters.domain) {
    if (filters.domain === "none") {
      missionWhere.domain = null;
    } else {
      missionWhere.domain = { name: filters.domain };
    }
  }

  if (filters.department) {
    if (filters.department === "none") {
      missionWhere.addresses = { some: { departmentCode: null } };
    } else {
      missionWhere.addresses = { some: { departmentCode: filters.department } };
    }
  }

  if (filters.organizationName) {
    if (filters.organizationName === "none") {
      missionWhere.organizationName = null;
    } else {
      missionWhere.organizationName = filters.organizationName;
    }
  }

  if (filters.city) {
    if (filters.city === "none") {
      missionWhere.addresses = { ...missionWhere.addresses, some: { ...((missionWhere.addresses as any)?.some || {}), city: null } };
    } else {
      missionWhere.addresses = { ...missionWhere.addresses, some: { ...((missionWhere.addresses as any)?.some || {}), city: filters.city } };
    }
  }

  if (filters.activity) {
    if (filters.activity === "none") {
      missionWhere.activity = null;
    } else {
      missionWhere.activity = { name: filters.activity };
    }
  }

  if (filters.search) {
    missionWhere.OR = [{ title: { contains: filters.search, mode: "insensitive" } }, { organizationName: { contains: filters.search, mode: "insensitive" } }];
  }

  return { ...where, mission: missionWhere };
};

export const missionModerationStatusService = {
  async findOneMissionModerationStatus(id: string): Promise<MissionModerationRecord | null> {
    const status = await missionModerationStatusRepository.findUnique({ where: { id }, include: baseInclude });
    if (!status) {
      return null;
    }
    return toRecord(status as MissionModerationWithRelations);
  },

  async findManyModerationStatusesByIds(ids: string[]): Promise<MissionModerationRecord[]> {
    if (!ids.length) {
      return [];
    }
    const statuses = await missionModerationStatusRepository.findMany({
      where: { id: { in: ids } },
      include: baseInclude,
    });
    return statuses.map((status) => toRecord(status as MissionModerationWithRelations));
  },

  async findModerationStatuses(filters: ModerationFilters & { skip?: number; limit?: number }) {
    console.log("filters find", filters);
    const where = buildWhere(filters);

    console.log("where find", where);

    const [data, total] = await Promise.all([
      missionModerationStatusRepository.findMany({
        where,
        include: baseInclude,
        orderBy: { createdAt: Prisma.SortOrder.desc },
        skip: filters.skip ?? 0,
        take: filters.limit ?? 25,
      }),
      missionModerationStatusRepository.count(where),
    ]);

    return { data: data.map((status) => toRecord(status as MissionModerationWithRelations)), total };
  },

  async aggregateModerationStatuses(filters: ModerationFilters) {
    console.log("filters aggregations", filters);
    const where = buildWhere(filters);
    console.log("where aggregations", where);

    // Parallel aggregations using repositories
    const [statusResults, commentResults, publisherResults, orgResults, domainResults, activityResults, deptResults, cityResults, publishers, domains, activities] =
      await Promise.all([
        // MissionModerationStatus aggregations
        missionModerationStatusRepository.groupBy(["status"], where),
        missionModerationStatusRepository.groupBy(["comment"], where),
        // Mission aggregations
        missionRepository.groupBy(["publisherId"], where.mission || {}),
        missionRepository.groupBy(["organizationName"], where.mission || {}),
        missionRepository.groupBy(["domainId"], where.mission || {}),
        missionRepository.groupBy(["activityId"], where.mission || {}),
        // MissionAddress aggregations
        missionAddressRepository.groupBy(["departmentCode"], { mission: where.mission } as Prisma.MissionAddressWhereInput),
        missionAddressRepository.groupBy(["city"], { mission: where.mission } as Prisma.MissionAddressWhereInput),
        // Labels
        publisherRepository.findMany({ select: { id: true, name: true } }),
        domainRepository.findMany({ select: { id: true, name: true } }),
        activityRepository.findMany({ select: { id: true, name: true } }),
      ]);

    const publisherMap = new Map(publishers.map((p) => [p.id, p.name]));
    const domainMap = new Map(domains.map((d) => [d.id, d.name]));
    const activityMap = new Map(activities.map((a) => [a.id, a.name]));

    return {
      status: toAggItems(
        statusResults,
        (r) => r.status,
        (r) => r._count
      ),
      comments: toAggItems(
        commentResults,
        (r) => r.comment,
        (r) => r._count
      ),
      publishers: publisherResults
        .map((r) => ({ key: r.publisherId, doc_count: r._count, label: publisherMap.get(r.publisherId) ?? r.publisherId }))
        .sort((a, b) => b.doc_count - a.doc_count),
      organizations: toAggItems(
        orgResults,
        (r) => r.organizationName,
        (r) => r._count
      ),
      domains: domainResults.map((r) => ({ key: r.domainId ? (domainMap.get(r.domainId) ?? "") : "", doc_count: r._count })).sort((a, b) => b.doc_count - a.doc_count),
      activities: activityResults.map((r) => ({ key: r.activityId ? (activityMap.get(r.activityId) ?? "") : "", doc_count: r._count })).sort((a, b) => b.doc_count - a.doc_count),
      departments: toAggItems(
        deptResults,
        (r) => r.departmentCode,
        (r) => r._count
      ),
      cities: toAggItems(
        cityResults,
        (r) => r.city,
        (r) => r._count
      ),
    };
  },

  async update(id: string, patch: MissionModerationStatusUpdatePatch) {
    const updates: Prisma.MissionModerationStatusUpdateInput = {};
    if ("status" in patch) {
      updates.status = patch.status ?? "PENDING";
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

  async updateMany(ids: string[], patch: MissionModerationStatusUpdatePatch): Promise<MissionModerationRecord[]> {
    if (!ids.length) {
      return [];
    }

    const updates: Prisma.MissionModerationStatusUpdateInput = {};
    if ("status" in patch) {
      updates.status = patch.status ?? "PENDING";
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

    // Update all in a transaction
    await prismaCore.missionModerationStatus.updateMany({
      where: { id: { in: ids } },
      data: updates,
    });

    // Fetch updated records
    const updatedStatuses = await missionModerationStatusRepository.findMany({
      where: { id: { in: ids } },
      include: baseInclude,
    });

    return updatedStatuses.map((status) => toRecord(status as MissionModerationWithRelations));
  },

  async aggregateByOrganization(filters: { moderatorId: string; organizationName?: string }) {
    const where: Prisma.MissionModerationStatusWhereInput = {
      publisherId: filters.moderatorId,
      mission: {
        deletedAt: null,
        statusCode: "ACCEPTED",
      },
    };

    if (filters.organizationName) {
      (where.mission as Prisma.MissionWhereInput).organizationName = { contains: filters.organizationName, mode: "insensitive" };
    }

    const results = await missionModerationStatusRepository.findMany({
      where,
      select: {
        status: true,
        mission: { select: { organizationName: true } },
      },
    });

    const aggregation: Record<string, { total: number; ACCEPTED: number; REFUSED: number }> = {};

    for (const item of results) {
      const orgName = (item as any).mission?.organizationName;
      if (!orgName) {
        continue;
      }

      if (!aggregation[orgName]) {
        aggregation[orgName] = { total: 0, ACCEPTED: 0, REFUSED: 0 };
      }

      aggregation[orgName].total += 1;
      if (item.status === "ACCEPTED") {
        aggregation[orgName].ACCEPTED += 1;
      } else if (item.status === "REFUSED") {
        aggregation[orgName].REFUSED += 1;
      }
    }

    return { organization: aggregation, total: results.length };
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
            status: (input.status as ModerationEventStatus) ?? "PENDING",
            comment: input.comment ?? null,
            note: input.note ?? null,
            title: input.title ?? null,
          },
          create: {
            mission: { connect: { id: input.missionId } },
            publisherId: input.publisherId,
            status: (input.status as ModerationEventStatus) ?? "PENDING",
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
