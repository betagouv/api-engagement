import { Prisma } from "../db/core";

import { statEventRepository } from "../repositories/stat-event";
import { publisherService } from "../services/publisher";
import {
  AggregateMissionStatsParams,
  CountByTypeParams,
  CountClicksByPublisherForOrganizationSinceParams,
  CountEventsParams,
  FindWarningBotCandidatesParams,
  HasRecentStatEventWithClickIdParams,
  MissionStatsAggregations,
  ScrollStatEventsParams,
  ScrollStatEventsResult,
  SearchStatEventsParams,
  SearchViewStatsParams,
  SearchViewStatsResult,
  StatEventMissionStatsDetails,
  StatEventMissionStatsSummary,
  StatEventRecord,
  StatEventSource,
  StatEventType,
  ViewStatsFacet,
  ViewStatsFacetField,
  WarningBotAggregationBucket,
  WarningBotAggregations,
  WarningBotCandidate,
} from "../types/stat-event";

const DEFAULT_TYPES: StatEventType[] = ["click", "print", "apply", "account"];

const VIEW_STATS_FACET_FIELDS = ["type", "source", "missionDomain", "missionDepartmentName", "missionOrganizationId", "fromPublisherId", "toPublisherId", "tag"] as const;

type PrismaStatEventWithPublishers = Prisma.StatEventGetPayload<{
  include: {
    fromPublisher: { select: { id: true; name: true } };
    toPublisher: { select: { id: true; name: true } };
  };
}>;

function toPrisma(data: Partial<StatEventRecord>, options: { includeDefaults?: boolean } = {}) {
  const { includeDefaults = true } = options;
  const mapped: any = {
    id: data._id,
    type: data.type,
    createdAt: data.createdAt,
    clickUser: data.clickUser,
    clickId: data.clickId,
    requestId: data.requestId,
    origin: includeDefaults ? (data.origin ?? "") : data.origin,
    referer: includeDefaults ? (data.referer ?? "") : data.referer,
    userAgent: includeDefaults ? (data.userAgent ?? "") : data.userAgent,
    host: includeDefaults ? (data.host ?? "") : data.host,
    user: data.user,
    isBot: includeDefaults ? (data.isBot ?? false) : data.isBot,
    isHuman: includeDefaults ? (data.isHuman ?? false) : data.isHuman,
    source: includeDefaults ? (data.source ?? "publisher") : data.source,
    sourceId: includeDefaults ? (data.sourceId ?? "") : data.sourceId,
    sourceName: includeDefaults ? (data.sourceName ?? "") : data.sourceName,
    customAttributes: data.customAttributes as Prisma.JsonValue | undefined,
    status: includeDefaults ? (data.status ?? "PENDING") : data.status,
    fromPublisherId: includeDefaults ? (data.fromPublisherId ?? "") : data.fromPublisherId,
    toPublisherId: includeDefaults ? (data.toPublisherId ?? "") : data.toPublisherId,
    missionId: data.missionId,
    missionClientId: data.missionClientId,
    missionDomain: data.missionDomain,
    missionTitle: data.missionTitle,
    missionPostalCode: data.missionPostalCode,
    missionDepartmentName: data.missionDepartmentName,
    missionOrganizationId: data.missionOrganizationId,
    missionOrganizationName: data.missionOrganizationName,
    missionOrganizationClientId: data.missionOrganizationClientId,
    tag: data.tag,
    tags: includeDefaults ? (data.tags ?? []) : data.tags,
    exportToAnalytics: data.exportToAnalytics,
  };
  Object.keys(mapped).forEach((key) => mapped[key] === undefined && delete mapped[key]);
  return mapped;
}

function toStatEventRecord(row: PrismaStatEventWithPublishers): StatEventRecord {
  const { fromPublisher, toPublisher, id, ...rest } = row;
  return {
    _id: id,
    fromPublisherName: fromPublisher?.name,
    toPublisherName: toPublisher?.name,
    ...rest,
  } as StatEventRecord;
}

async function createStatEvent(event: StatEventRecord): Promise<string> {
  const result = await statEventRepository.create({ data: toPrisma(event) });
  return result.id;
}

async function updateStatEvent(id: string, patch: Partial<StatEventRecord>) {
  const data = toPrisma(patch, { includeDefaults: false });
  await statEventRepository.update({ where: { id }, data });
}

async function findOneStatEventById(id: string): Promise<StatEventRecord | null> {
  const result = (await statEventRepository.findUnique({ where: { id } })) as PrismaStatEventWithPublishers | null;
  return result ? toStatEventRecord(result) : null;
}

async function countStatEvents() {
  return statEventRepository.count();
}

async function findOneStatEventByMissionId(missionId: string): Promise<StatEventRecord | null> {
  const result = (await statEventRepository.findFirst({
    where: { missionId },
    orderBy: { createdAt: "desc" },
  })) as PrismaStatEventWithPublishers | null;
  return result ? toStatEventRecord(result) : null;
}

async function countStatEventsByTypeSince({ publisherId, from, types }: CountByTypeParams) {
  const statTypes = types?.length ? types : DEFAULT_TYPES;
  const counts: Record<StatEventType, number> = {
    click: 0,
    print: 0,
    apply: 0,
    account: 0,
  };

  await Promise.all(
    statTypes.map(async (type) => {
      const total = await statEventRepository.count({
        where: {
          toPublisherId: publisherId,
          createdAt: { gte: from },
          type: type as any,
        },
      });
      counts[type] = total;
    })
  );
  return counts;
}

async function countStatEventsByCriteria({ type, user, clickUser, from }: CountEventsParams): Promise<number> {
  const where: Prisma.StatEventWhereInput = {};

  if (type) {
    where.type = type as any;
  }

  if (user) {
    where.user = user;
  }

  if (clickUser) {
    where.clickUser = clickUser;
  }

  if (from) {
    where.createdAt = { gte: from };
  }

  return statEventRepository.count({ where });
}

async function hasStatEventWithRecentClickId({ type, clickId, since }: HasRecentStatEventWithClickIdParams): Promise<boolean> {
  const total = await statEventRepository.count({
    where: {
      type: type as any,
      clickId: clickId,
      createdAt: { gte: since },
    },
  });
  return total > 0;
}

async function countStatEventClicksByPublisherForOrganizationSince({ publisherIds, organizationClientId, from }: CountClicksByPublisherForOrganizationSinceParams) {
  if (!publisherIds.length) {
    return {} as Record<string, number>;
  }

  const rows = (await statEventRepository.groupBy({
    by: ["fromPublisherId"],
    where: {
      type: "click" as any,
      isBot: { not: true },
      missionOrganizationClientId: organizationClientId,
      fromPublisherId: { in: publisherIds },
      createdAt: { gte: from },
    },
    _count: { _all: true },
  } as any)) as { fromPublisherId: string; _count: { _all: number } }[];

  return rows.reduce(
    (acc, row) => {
      acc[row.fromPublisherId] = row._count._all;
      return acc;
    },
    {} as Record<string, number>
  );
}

async function findStatEvents({ fromPublisherId, toPublisherId, type, sourceId, size = 25, skip = 0 }: SearchStatEventsParams): Promise<StatEventRecord[]> {
  const where: Prisma.StatEventWhereInput = {
    isBot: false,
  };

  if (fromPublisherId) {
    where.fromPublisherId = fromPublisherId;
  }

  if (toPublisherId) {
    where.toPublisherId = toPublisherId;
  }

  if (type) {
    where.type = type as any;
  }

  if (sourceId) {
    where.sourceId = sourceId;
  }

  const rows = (await statEventRepository.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take: size,
  })) as PrismaStatEventWithPublishers[];

  return rows.map(toStatEventRecord);
}

async function findStatEventViews({ publisherId, size = 10, filters = {}, facets = [] }: SearchViewStatsParams): Promise<SearchViewStatsResult> {
  const where: Prisma.StatEventWhereInput = {
    NOT: { isBot: true },
    OR: [{ toPublisherId: publisherId }, { fromPublisherId: publisherId }],
  };

  const andFilters: Prisma.StatEventWhereInput[] = [];

  if (filters.fromPublisherName) {
    andFilters.push({ fromPublisher: { is: { name: filters.fromPublisherName } } });
  }
  if (filters.toPublisherName) {
    andFilters.push({ toPublisher: { is: { name: filters.toPublisherName } } });
  }
  if (filters.fromPublisherId) {
    andFilters.push({ fromPublisherId: filters.fromPublisherId });
  }
  if (filters.toPublisherId) {
    andFilters.push({ toPublisherId: filters.toPublisherId });
  }
  if (filters.missionDomain) {
    andFilters.push({ missionDomain: filters.missionDomain });
  }
  if (filters.type) {
    andFilters.push({ type: filters.type as StatEventType });
  }
  if (filters.source) {
    andFilters.push({ source: filters.source as StatEventSource });
  }

  if (filters.createdAt?.length) {
    const createdAtFilter: Prisma.DateTimeFilter = {};
    filters.createdAt.forEach(({ operator, date }) => {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return;
      }
      if (operator === "gt") {
        createdAtFilter.gt = date;
      }
      if (operator === "lt") {
        createdAtFilter.lt = date;
      }
    });
    if (Object.keys(createdAtFilter).length) {
      andFilters.push({ createdAt: createdAtFilter });
    }
  }

  if (andFilters.length) {
    where.AND = andFilters;
  }

  const total = await statEventRepository.count({ where });

  const facetsResult: Record<string, ViewStatsFacet[]> = {};
  await Promise.all(
    facets.map(async (facet) => {
      if (!VIEW_STATS_FACET_FIELDS.includes(facet as ViewStatsFacetField)) {
        return;
      }

      const column = facet as ViewStatsFacetField;
      try {
        const rows = (await statEventRepository.groupBy({
          by: [column],
          where,
          _count: { _all: true },
        } as any)) as { [key: string]: any; _count: { _all: number } }[];
        rows.sort((a, b) => (b._count._all ?? 0) - (a._count._all ?? 0));
        const limited = rows.slice(0, size);

        facetsResult[facet] = limited
          .filter((row) => row[column] !== null && row[column] !== undefined && row[column] !== "")
          .map((row) => ({ key: row[column], doc_count: row._count._all }));
      } catch (error) {
        console.error(`[StatEvent] Error aggregating facet ${facet}:`, error);
      }
    })
  );

  return { total, facets: facetsResult };
}

async function findStatEventWarningBotCandidatesSince({ from, minClicks }: FindWarningBotCandidatesParams): Promise<WarningBotCandidate[]> {
  const where: Prisma.StatEventWhereInput = {
    type: "click" as any,
    createdAt: { gte: from },
  };

  const grouped = (await statEventRepository.groupBy({
    by: ["user"],
    where,
    _count: { _all: true },
    having: {
      id: {
        _count: { gte: minClicks },
      },
    },
  } as any)) as { user: string | null; _count: { _all: number } }[];

  const users = grouped.map((row) => row.user).filter((value): value is string => typeof value === "string" && value.length > 0);

  if (!users.length) {
    return [];
  }

  const [publisherRows, userAgentRows] = await Promise.all([
    statEventRepository.groupBy({
      by: ["user", "fromPublisherId"],
      where: { ...where, user: { in: users } },
      _count: { _all: true },
    } as any),
    statEventRepository.groupBy({
      by: ["user", "userAgent"],
      where: { ...where, user: { in: users } },
      _count: { _all: true },
    } as any),
  ]);

  const publisherIds = (publisherRows as { fromPublisherId: string | null }[])
    .map((row) => row.fromPublisherId)
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  const publisherNameMap = await publisherService.getPublisherNameMap(publisherIds);

  const aggregateByUser = (rows: any[], keyExtractor: (row: any) => string | null | undefined, options: { skipNullKeys?: boolean } = {}) => {
    const { skipNullKeys = false } = options;
    const buckets = new Map<string, WarningBotAggregationBucket[]>();
    rows.forEach((row) => {
      const user = row.user as string | null;
      if (!user) {
        return;
      }
      const rawKey = keyExtractor(row);
      if (skipNullKeys && (rawKey === null || rawKey === undefined)) {
        return;
      }
      const list = buckets.get(user) ?? [];
      list.push({ key: rawKey ?? "", doc_count: row._count?._all ?? 0 });
      buckets.set(user, list);
    });
    return buckets;
  };

  const publishersByUser = aggregateByUser(
    publisherRows as any[],
    (row) => {
      const publisherId = row.fromPublisherId as string | null;
      if (!publisherId) {
        return null;
      }
      return publisherNameMap.get(publisherId) ?? publisherId;
    },
    {
      skipNullKeys: true,
    }
  );
  const userAgentsByUser = aggregateByUser(userAgentRows as any[], (row) => row.userAgent);

  return grouped
    .filter((row): row is { user: string; _count: { _all: number } } => Boolean(row.user))
    .map((row) => ({
      user: row.user,
      clickCount: row._count?._all ?? 0,
      publishers: publishersByUser.get(row.user) ?? [],
      userAgents: userAgentsByUser.get(row.user) ?? [],
    }));
}

async function aggregateStatEventWarningBotByUser(user: string): Promise<WarningBotAggregations> {
  const rows = await statEventRepository.aggregateWarningBotBuckets(user);

  const aggregations: WarningBotAggregations = {
    type: [],
    publisherTo: [],
    publisherFrom: [],
  };

  rows.forEach((row) => {
    const bucket = row.bucket;
    const target = bucket === "type" ? aggregations.type : bucket === "publisherTo" ? aggregations.publisherTo : aggregations.publisherFrom;
    target.push({ key: row.key, doc_count: row.doc_count });
  });

  return aggregations;
}

async function updateStatEventsBotFlagForUser(user: string, isBot: boolean): Promise<void> {
  await statEventRepository.updateMany({ where: { user }, data: { isBot } });
}

async function reassignStatEventsForSource(sourceId: string, update: { fromPublisherId?: string; toPublisherId?: string }): Promise<void> {
  const data: Prisma.StatEventUpdateManyArgs["data"] = {};
  if (update.fromPublisherId) {
    data.fromPublisherId = update.fromPublisherId;
  }
  if (update.toPublisherId) {
    data.toPublisherId = update.toPublisherId;
  }
  await statEventRepository.updateMany({ where: { sourceId }, data });
}

async function aggregateStatEventsForMission({
  from,
  to,
  toPublisherName,
  excludeToPublisherName,
  excludeUsers = [],
}: AggregateMissionStatsParams): Promise<MissionStatsAggregations> {
  const baseWhere: Prisma.StatEventWhereInput = {
    createdAt: { gte: from, lt: to },
  };

  const andConditions: Prisma.StatEventWhereInput[] = [];

  if (toPublisherName) {
    andConditions.push({ toPublisher: { is: { name: toPublisherName } } });
  }

  if (excludeToPublisherName) {
    andConditions.push({ NOT: { toPublisher: { is: { name: excludeToPublisherName } } } });
  }

  if (excludeUsers.length) {
    andConditions.push({ NOT: { user: { in: excludeUsers } } });
  }

  if (andConditions.length) {
    baseWhere.AND = andConditions;
  }

  const createEmptyAggregations = () => {
    return DEFAULT_TYPES.reduce((acc, type) => {
      acc[type] = { eventCount: 0, missionCount: 0 };
      return acc;
    }, {} as MissionStatsAggregations);
  };
  const result = createEmptyAggregations();

  await Promise.all(
    DEFAULT_TYPES.map(async (type) => {
      const where: Prisma.StatEventWhereInput = {
        ...baseWhere,
        type: type as StatEventType,
      };

      const [eventCount, missionGroupsRaw] = await Promise.all([
        statEventRepository.count({ where }),
        statEventRepository.groupBy({
          by: ["missionId"],
          where: { ...where, missionId: { not: null } },
          _count: { _all: true },
        }),
      ]);

      const missionGroups = missionGroupsRaw as { missionId: string | null; _count: { _all: number } }[];
      const missionCount = missionGroups.length;

      result[type] = { eventCount, missionCount };
    })
  );

  return result;
}

async function findStatEventMissionStatsWithDetails(missionId: string): Promise<{ clicks: StatEventMissionStatsDetails[]; applications: StatEventMissionStatsDetails[] }> {
  type MissionStatsDetailsGroup = { fromPublisherId: string | null; _count: { _all: number } };

  const [applicationsRaw, clicksRaw] = await Promise.all([
    statEventRepository.groupBy({
      by: ["fromPublisherId"],
      where: {
        missionId,
        isBot: false,
        type: "apply",
      },
      _count: { _all: true },
    }),
    statEventRepository.groupBy({
      by: ["fromPublisherId"],
      where: {
        missionId,
        isBot: false,
        type: "click",
      },
      _count: { _all: true },
    }),
  ]);

  const applications = applicationsRaw as MissionStatsDetailsGroup[];
  const clicks = clicksRaw as MissionStatsDetailsGroup[];

  const mapGroup = (group: MissionStatsDetailsGroup): StatEventMissionStatsDetails => ({
    key: group.fromPublisherId ?? "",
    name: undefined,
    logo: undefined,
    url: undefined,
    doc_count: group._count._all,
  });

  return {
    applications: applications.map(mapGroup),
    clicks: clicks.map(mapGroup),
  };
}

async function findStatEventMissionStatsSummary(missionId: string): Promise<{ clicks: StatEventMissionStatsSummary[]; applications: StatEventMissionStatsSummary[] }> {
  type MissionStatsSummaryGroup = { fromPublisherId: string | null; _count: { _all: number } };

  const [clicksRaw, applicationsRaw] = await Promise.all([
    statEventRepository.groupBy({
      by: ["fromPublisherId"],
      where: {
        missionId,
        isBot: false,
        type: "click",
      },
      _count: { _all: true },
    }),
    statEventRepository.groupBy({
      by: ["fromPublisherId"],
      where: {
        missionId,
        isBot: false,
        type: "apply",
      },
      _count: { _all: true },
    }),
  ]);

  const clicks = clicksRaw as MissionStatsSummaryGroup[];
  const applications = applicationsRaw as MissionStatsSummaryGroup[];

  const mapGroup = (group: MissionStatsSummaryGroup): StatEventMissionStatsSummary => ({
    key: group.fromPublisherId ?? "",
    doc_count: group._count._all,
  });

  return {
    clicks: clicks.map(mapGroup),
    applications: applications.map(mapGroup),
  };
}

async function scrollStatEvents({ type, batchSize = 5000, cursor = null, filters }: ScrollStatEventsParams): Promise<ScrollStatEventsResult> {
  type PgCursor = { createdAt: string; id: string };

  let parsedCursor: PgCursor | null = null;
  if (cursor) {
    try {
      const rawCursor = JSON.parse(cursor);
      if (rawCursor && typeof rawCursor === "object" && typeof rawCursor.createdAt === "string" && typeof rawCursor.id === "string") {
        parsedCursor = rawCursor as PgCursor;
      }
    } catch {
      // Ignore malformed cursor and fall back to the first page
    }
  }

  const sharedFilters: Prisma.StatEventWhereInput[] = [];

  if (filters?.hasBotOrHumanFlag) {
    sharedFilters.push({ OR: [{ isBot: true }, { isHuman: true }] });
  }

  if (filters?.exportToPgStatusMissing) {
    sharedFilters.push({ exportToAnalytics: null });
  }

  const cursorFilter: Prisma.StatEventWhereInput | undefined = (() => {
    if (!parsedCursor) {
      return undefined;
    }

    const cursorDate = new Date(parsedCursor.createdAt);
    if (Number.isNaN(cursorDate.getTime())) {
      return undefined;
    }

    return {
      OR: [
        { createdAt: { gt: cursorDate } },
        {
          AND: [{ createdAt: { equals: cursorDate } }, { id: { gt: parsedCursor.id } }],
        },
      ],
    };
  })();

  const whereForRows: Prisma.StatEventWhereInput = { type: type as any };
  if (sharedFilters.length || cursorFilter) {
    whereForRows.AND = [];
    if (sharedFilters.length) {
      whereForRows.AND.push(...sharedFilters);
    }
    if (cursorFilter) {
      whereForRows.AND.push(cursorFilter);
    }
  }

  const whereForCount: Prisma.StatEventWhereInput = { type: type as any };
  if (sharedFilters.length) {
    whereForCount.AND = [...sharedFilters];
  }

  const [rows, total] = await Promise.all([
    statEventRepository.findMany({
      where: whereForRows,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: batchSize,
    }) as Promise<PrismaStatEventWithPublishers[]>,
    cursor ? Promise.resolve(0) : statEventRepository.count({ where: whereForCount }),
  ]);

  const nextCursor =
    rows.length < batchSize
      ? null
      : JSON.stringify({
          createdAt: rows[rows.length - 1].createdAt.toISOString(),
          id: rows[rows.length - 1].id,
        });

  return {
    events: rows.map(toStatEventRecord),
    cursor: nextCursor,
    total: cursor ? 0 : total,
  };
}

async function updateStatEventsExportStatus(ids: string[], status: "SUCCESS" | "FAILURE") {
  if (!ids.length) {
    return;
  }

  await statEventRepository.updateMany({
    where: { id: { in: ids } },
    data: { exportToAnalytics: status },
  });
}

export const statEventService = {
  createStatEvent,
  updateStatEvent,
  findOneStatEventById,
  findOneStatEventByMissionId,
  findStatEvents,
  findStatEventViews,
  countStatEvents,
  countStatEventsByTypeSince,
  countStatEventsByCriteria,
  countStatEventClicksByPublisherForOrganizationSince,
  aggregateStatEventsForMission,
  findStatEventMissionStatsWithDetails,
  findStatEventMissionStatsSummary,
  scrollStatEvents,
  updateStatEventsExportStatus,
  reassignStatEventsForSource,
  findStatEventWarningBotCandidatesSince,
  aggregateStatEventWarningBotByUser,
  updateStatEventsBotFlagForUser,
  hasStatEventWithRecentClickId,
};

export default statEventService;
