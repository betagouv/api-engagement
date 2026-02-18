import { Mission, MissionModerationStatus, ModerationEventStatus, Prisma } from "../db/core";
import { activityRepository } from "../repositories/activity";
import { domainRepository } from "../repositories/domain";
import { missionRepository } from "../repositories/mission";
import { missionActivityRepository } from "../repositories/mission-activity";
import { missionAddressRepository } from "../repositories/mission-address";
import { missionModerationStatusRepository } from "../repositories/mission-moderation-status";
import { publisherRepository } from "../repositories/publisher";
import publisherOrganizationRepository from "../repositories/publisher-organization";
import { MissionModerationRecord, ModerationFilters } from "../types/mission-moderation-status";
import { PublisherOrganizationWithRelations } from "../types/publisher-organization";
import { buildWhere } from "../utils/mission-moderation-status";

export type MissionModerationStatusUpdatePatch = Pick<Prisma.MissionModerationStatusCreateInput, "status" | "comment" | "note" | "title">;

type MissionModerationWithRelations = MissionModerationStatus & {
  mission: Mission & {
    domain: { name: string } | null;
    publisher: { name: string | null };
    addresses: { city: string | null; departmentCode: string | null; departmentName: string | null; postalCode: string | null }[];
    publisherOrganization: PublisherOrganizationWithRelations;
  };
};

const toRecord = (status: MissionModerationWithRelations): MissionModerationRecord => {
  const addresses = status.mission.addresses || [];
  const primaryAddress = addresses[0] ?? {};
  const publisherOrganization = status.mission.publisherOrganization;
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
    missionApplicationUrl: status.mission.applicationUrl ?? null,
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
    missionPublisherOrganizationId: publisherOrganization?.id ?? null,
    missionOrganizationName: publisherOrganization?.name ?? null,
    missionOrganizationClientId: publisherOrganization?.clientId ?? null,
    missionOrganizationSirenVerified: publisherOrganization?.organizationVerified?.siren ?? null,
    missionOrganizationRNAVerified: publisherOrganization?.organizationVerified?.rna ?? null,
    missionOrganizationSiren: publisherOrganization?.siren ?? null,
    missionOrganizationRNA: publisherOrganization?.rna ?? null,
    missionOrganizationVerifiedId: publisherOrganization?.organizationVerified?.id ?? null,
  };
};

const baseInclude = {
  mission: {
    include: {
      domain: { select: { name: true } },
      publisher: { select: { name: true } },
      addresses: { select: { city: true, departmentCode: true, departmentName: true, postalCode: true } },
      publisherOrganization: {
        select: {
          id: true,
          name: true,
          clientId: true,
          rna: true,
          siren: true,
          organizationVerified: {
            select: {
              id: true,
              rna: true,
              siren: true,
              siret: true,
            },
          },
        },
      },
    },
  },
};

type AggregationItem = { key: string; doc_count: number; label?: string };

const toAggItems = <T>(results: T[], keyGetter: (item: T) => string | null, countGetter: (item: T) => number): AggregationItem[] =>
  results.map((item) => ({ key: keyGetter(item) ?? "", doc_count: countGetter(item) })).sort((a, b) => b.doc_count - a.doc_count);

export const missionModerationStatusService = {
  async findOneMissionModerationStatus(id: string): Promise<MissionModerationRecord | null> {
    const status = await missionModerationStatusRepository.findUnique({ where: { id }, include: baseInclude });
    if (!status) {
      return null;
    }
    return toRecord(status as MissionModerationWithRelations);
  },

  async findModerationStatuses(filters: ModerationFilters & { skip?: number; limit?: number; ids?: string[] }) {
    // If ids are provided, use them directly instead of building where clause from filters
    if (filters.ids && filters.ids.length > 0) {
      const data = await missionModerationStatusRepository.findMany({
        where: { id: { in: filters.ids } },
        include: baseInclude,
      });
      return { data: data.map((status) => toRecord(status as MissionModerationWithRelations)), total: data.length };
    }

    const { where } = buildWhere(filters);

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
    const { where, missionWhere } = buildWhere(filters);

    // TODO: Refactor this to remove slow queries
    // Parallel aggregations using repositories
    const [statusResults, commentResults] = await Promise.all([
      // MissionModerationStatus aggregations
      missionModerationStatusRepository.groupBy(["status"], where),
      missionModerationStatusRepository.groupBy(["comment"], { ...where, status: ModerationEventStatus.REFUSED }),
    ]);
    const [publisherResults, domainResults, activityResults] = await Promise.all([
      // Mission aggregations
      missionRepository.groupBy(["publisherId"], missionWhere as Prisma.MissionWhereInput),
      missionRepository.groupBy(["domainId"], missionWhere as Prisma.MissionWhereInput),
      missionActivityRepository.groupBy(["activityId"], { mission: missionWhere as Prisma.MissionWhereInput }),
    ]);

    const [orgResults, deptResults, cityResults] = await Promise.all([
      // MissionAddress aggregations
      publisherOrganizationRepository.groupBy(["organizationName"], { missions: { some: missionWhere } } as Prisma.PublisherOrganizationWhereInput),
      missionAddressRepository.groupBy(["departmentCode"], { mission: missionWhere as Prisma.MissionWhereInput } as Prisma.MissionAddressWhereInput),
      missionAddressRepository.groupBy(["city"], { mission: missionWhere as Prisma.MissionWhereInput } as Prisma.MissionAddressWhereInput),
    ]);
    const [publishers, domains, activities] = await Promise.all([
      // Labels
      publisherRepository.findMany({ where: { missions: { some: missionWhere } } as Prisma.PublisherWhereInput, select: { id: true, name: true } }),
      domainRepository.findMany({ where: { missions: { some: missionWhere } } as Prisma.DomainWhereInput, select: { id: true, name: true } }),
      activityRepository.findMany({ where: { missionActivities: { some: { mission: missionWhere } } } as Prisma.ActivityWhereInput, select: { id: true, name: true } }),
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
      updates.status = patch.status ?? ModerationEventStatus.PENDING;
      if (updates.status !== ModerationEventStatus.REFUSED) {
        updates.comment = null;
      } else {
        updates.comment = patch.comment ?? null;
      }
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

  async updateMany(
    ids: string[],
    patch: MissionModerationStatusUpdatePatch
  ): Promise<{ id: string; status: ModerationEventStatus | null; comment: string | null; missionId: string }[]> {
    if (!ids.length) {
      return [];
    }

    const updates: Prisma.MissionModerationStatusUpdateInput = {};
    if ("status" in patch) {
      updates.status = patch.status ?? ModerationEventStatus.PENDING;
      if (updates.status !== ModerationEventStatus.REFUSED) {
        updates.comment = null;
      } else {
        updates.comment = patch.comment ?? null;
      }
    }
    if ("note" in patch) {
      updates.note = patch.note ?? null;
    }
    if ("title" in patch) {
      updates.title = patch.title ?? null;
    }

    // Update all in a transaction
    await missionModerationStatusRepository.updateMany({
      where: { id: { in: ids } },
      data: updates,
    });

    // Fetch updated records
    const updatedStatuses = await missionModerationStatusRepository.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        status: true,
        comment: true,
        missionId: true,
      },
    });

    return updatedStatuses;
  },

  async create(input: Prisma.MissionModerationStatusCreateInput) {
    const res = await missionModerationStatusRepository.create({ data: input, include: baseInclude });
    return toRecord(res as MissionModerationWithRelations);
  },

  async aggregateByOrganization(filters: { moderatorId: string; organizationName?: string }) {
    const where = {
      publisherId: filters.moderatorId,
      mission: { deletedAt: null, statusCode: "ACCEPTED" } as Prisma.MissionWhereInput,
    };

    if (filters.organizationName) {
      where.mission.publisherOrganization = { is: { organizationName: { contains: filters.organizationName, mode: "insensitive" } } } as Prisma.PublisherOrganizationWhereInput;
    }

    const results = await missionModerationStatusRepository.findMany({
      where,
      select: {
        status: true,
        mission: { select: { publisherOrganization: { select: { organizationName: true } } } },
      },
    });

    const aggregation: Record<string, { total: number; ACCEPTED: number; REFUSED: number }> = {};

    for (const item of results) {
      const orgName = (item as any).mission?.publisherOrganization?.organizationName;
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
    return missionModerationStatusRepository.upsertMany(
      inputs.map((input) => ({
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
      }))
    );
  },
};

export default missionModerationStatusService;
