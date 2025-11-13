import { v4 as uuidv4 } from "uuid";

import { Prisma } from "../db/core";

import { statEventRepository } from "../repositories/stat-event";
import {
  AggregateMissionStatsParams,
  CountByTypeParams,
  CountClicksByPublisherForOrganizationSinceParams,
  CountEventsParams,
  HasRecentStatEventWithClickIdParams,
  MissionStatsAggregations,
  ScrollStatEventsFilters,
  ScrollStatEventsParams,
  ScrollStatEventsResult,
  SearchStatEventsParams,
  SearchViewStatsParams,
  SearchViewStatsResult,
  StatEventType,
  StatEventRecord,
  UpdateStatEventOptions,
  StatEventMissionStatsDetails,
  StatEventMissionStatsSummary,
  ViewStatsFacet,
  WarningBotAggregationBucket,
  WarningBotAggregations,
  FindWarningBotCandidatesParams,
  WarningBotCandidate,
} from "../types/stat-event";

const DEFAULT_TYPES: StatEventType[] = ["click", "print", "apply", "account"];

function toPg(data: Partial<StatEventRecord>, options: { includeDefaults?: boolean } = {}) {
  const { includeDefaults = true } = options;
  const mapped: any = {
    type: data.type,
    created_at: data.createdAt,
    click_user: data.clickUser,
    click_id: data.clickId,
    request_id: data.requestId,
    origin: includeDefaults ? (data.origin ?? "") : data.origin,
    referer: includeDefaults ? (data.referer ?? "") : data.referer,
    user_agent: includeDefaults ? (data.userAgent ?? "") : data.userAgent,
    host: includeDefaults ? (data.host ?? "") : data.host,
    user: data.user,
    is_bot: includeDefaults ? (data.isBot ?? false) : data.isBot,
    is_human: includeDefaults ? (data.isHuman ?? false) : data.isHuman,
    source: includeDefaults ? (data.source ?? "publisher") : data.source,
    source_id: includeDefaults ? (data.sourceId ?? "") : data.sourceId,
    source_name: includeDefaults ? (data.sourceName ?? "") : data.sourceName,
    custom_attributes: data.customAttributes as Prisma.JsonValue | undefined,
    status: includeDefaults ? (data.status ?? "PENDING") : data.status,
    from_publisher_id: includeDefaults ? (data.fromPublisherId ?? "") : data.fromPublisherId,
    from_publisher_name: includeDefaults ? (data.fromPublisherName ?? "") : data.fromPublisherName,
    to_publisher_id: includeDefaults ? (data.toPublisherId ?? "") : data.toPublisherId,
    to_publisher_name: includeDefaults ? (data.toPublisherName ?? "") : data.toPublisherName,
    mission_id: data.missionId,
    mission_client_id: data.missionClientId,
    mission_domain: data.missionDomain,
    mission_title: data.missionTitle,
    mission_postal_code: data.missionPostalCode,
    mission_department_name: data.missionDepartmentName,
    mission_organization_id: data.missionOrganizationId,
    mission_organization_name: data.missionOrganizationName,
    mission_organization_client_id: data.missionOrganizationClientId,
    tag: data.tag,
    tags: includeDefaults ? (data.tags ?? []) : data.tags,
    export_to_analytics: data.exportToAnalytics,
  };
  Object.keys(mapped).forEach((key) => mapped[key] === undefined && delete mapped[key]);
  return mapped;
}

function fromPg(row: any): StatEventRecord {
  return {
    _id: row.id,
    type: row.type,
    createdAt: row.created_at,
    clickUser: row.click_user ?? undefined,
    clickId: row.click_id ?? undefined,
    requestId: row.request_id ?? undefined,
    origin: row.origin,
    referer: row.referer,
    userAgent: row.user_agent,
    host: row.host,
    user: row.user ?? undefined,
    isBot: row.is_bot,
    isHuman: row.is_human,
    source: row.source,
    sourceId: row.source_id,
    sourceName: row.source_name,
    customAttributes: row.custom_attributes ?? undefined,
    status: row.status,
    fromPublisherId: row.from_publisher_id,
    fromPublisherName: row.from_publisher_name,
    toPublisherId: row.to_publisher_id,
    toPublisherName: row.to_publisher_name,
    missionId: row.mission_id ?? undefined,
    missionClientId: row.mission_client_id ?? undefined,
    missionDomain: row.mission_domain ?? undefined,
    missionTitle: row.mission_title ?? undefined,
    missionPostalCode: row.mission_postal_code ?? undefined,
    missionDepartmentName: row.mission_department_name ?? undefined,
    missionOrganizationId: row.mission_organization_id ?? undefined,
    missionOrganizationName: row.mission_organization_name ?? undefined,
    missionOrganizationClientId: row.mission_organization_client_id ?? undefined,
    tag: row.tag ?? undefined,
    tags: row.tags ?? undefined,
    exportToAnalytics: row.export_to_analytics ?? undefined,
  } as StatEventRecord;
}

async function createStatEvent(event: StatEventRecord): Promise<string> {
  const id = event._id || uuidv4();
  await statEventRepository.create({ data: { id, ...toPg(event) } });
  return id;
}

async function updateStatEvent(id: string, patch: Partial<StatEventRecord>, _options: UpdateStatEventOptions = {}) {
  const data = toPg(patch, { includeDefaults: false });
  await statEventRepository.update({ where: { id }, data });
}

async function findOneStatEventById(id: string): Promise<StatEventRecord | null> {
  const pgRes = await statEventRepository.findUnique({ where: { id } });
  return pgRes ? fromPg(pgRes) : null;
}

async function countStatEvents() {
  return statEventRepository.count();
}

async function findOneStatEventByMissionId(missionId: string): Promise<StatEventRecord | null> {
  const pgRes = await statEventRepository.findFirst({
    where: { mission_id: missionId },
    orderBy: { created_at: "desc" },
  });
  return pgRes ? fromPg(pgRes) : null;
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
          to_publisher_id: publisherId,
          created_at: { gte: from },
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
    where.click_user = clickUser;
  }

  if (from) {
    where.created_at = { gte: from };
  }

  return statEventRepository.count({ where });
}

async function hasStatEventWithRecentClickId({ type, clickId, since }: HasRecentStatEventWithClickIdParams): Promise<boolean> {
  const total = await statEventRepository.count({
    where: {
      type: type as any,
      click_id: clickId,
      created_at: { gte: since },
    },
  });
  return total > 0;
}

async function countStatEventClicksByPublisherForOrganizationSince({ publisherIds, organizationClientId, from }: CountClicksByPublisherForOrganizationSinceParams) {
  if (!publisherIds.length) {
    return {} as Record<string, number>;
  }

  const rows = (await statEventRepository.groupBy({
    by: ["from_publisher_id"],
    where: {
      type: "click" as any,
      is_bot: { not: true },
      mission_organization_client_id: organizationClientId,
      from_publisher_id: { in: publisherIds },
      created_at: { gte: from },
    },
    _count: { _all: true },
  } as any)) as { from_publisher_id: string; _count: { _all: number } }[];

  return rows.reduce(
    (acc, row) => {
      acc[row.from_publisher_id] = row._count._all;
      return acc;
    },
    {} as Record<string, number>
  );
}

async function findStatEvents({ fromPublisherId, toPublisherId, type, sourceId, size = 25, skip = 0 }: SearchStatEventsParams): Promise<StatEventRecord[]> {
  const where: Prisma.StatEventWhereInput = {
    is_bot: false,
  };

  if (fromPublisherId) {
    where.from_publisher_id = fromPublisherId;
  }

  if (toPublisherId) {
    where.to_publisher_id = toPublisherId;
  }

  if (type) {
    where.type = type as any;
  }

  if (sourceId) {
    where.source_id = sourceId;
  }

  const rows = await statEventRepository.findMany({
    where,
    orderBy: { created_at: "desc" },
    skip,
    take: size,
  });

  return rows.map(fromPg);
}

async function findStatEventViews({ publisherId, size = 10, filters = {}, facets = [] }: SearchViewStatsParams): Promise<SearchViewStatsResult> {
  const where: Record<string, any> = {
    NOT: { is_bot: true },
    OR: [{ to_publisher_id: publisherId }, { from_publisher_id: publisherId }],
  };

  const andFilters: Record<string, any>[] = [];

  if (filters.fromPublisherName) {
    andFilters.push({ from_publisher_name: filters.fromPublisherName });
  }
  if (filters.toPublisherName) {
    andFilters.push({ to_publisher_name: filters.toPublisherName });
  }
  if (filters.fromPublisherId) {
    andFilters.push({ from_publisher_id: filters.fromPublisherId });
  }
  if (filters.toPublisherId) {
    andFilters.push({ to_publisher_id: filters.toPublisherId });
  }
  if (filters.missionDomain) {
    andFilters.push({ mission_domain: filters.missionDomain });
  }
  if (filters.type) {
    andFilters.push({ type: filters.type });
  }
  if (filters.source) {
    andFilters.push({ source: filters.source });
  }

  if (filters.createdAt?.length) {
    const createdAtFilter: Record<string, Date> = {};
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
      andFilters.push({ created_at: createdAtFilter });
    }
  }

  if (andFilters.length) {
    where.AND = andFilters;
  }

  const total = await statEventRepository.count({ where });

  const facetsResult: Record<string, ViewStatsFacet[]> = {};
  await Promise.all(
    facets.map(async (facet) => {
      if (typeof facet !== "string" || !facet) {
        return;
      }
      const column = toPgColumnName(facet);
      if (!column) {
        return;
      }
      try {
        const rows = (await statEventRepository.groupBy({
          by: [column],
          where,
          _count: { _all: true },
          orderBy: { _count: { _all: "desc" } },
          take: size,
        } as any)) as { [key: string]: any; _count: { _all: number } }[];

        facetsResult[facet] = rows
          .filter((row) => row[column] !== null && row[column] !== undefined && row[column] !== "")
          .map((row) => ({ key: row[column], doc_count: row._count._all }));
      } catch (error) {
        console.error(`[StatEvent] Error aggregating facet ${facet}:`, error);
      }
    })
  );

  return { total, facets: facetsResult };
}

function mapAggregationRow(row: any, field: string): WarningBotAggregationBucket {
  const value = row[field];
  return {
    key: value ?? "",
    doc_count: row._count?._all ?? 0,
  };
}

async function findStatEventWarningBotCandidatesSince({ from, minClicks }: FindWarningBotCandidatesParams): Promise<WarningBotCandidate[]> {
  const where: Prisma.StatEventWhereInput = {
    type: "click" as any,
    created_at: { gte: from },
  };

  const grouped = (await statEventRepository.groupBy({
    by: ["user"],
    where,
    _count: { _all: true },
    having: {
      _count: {
        _all: { gte: minClicks },
      },
    },
  } as any)) as { user: string | null; _count: { _all: number } }[];

  const users = grouped.map((row) => row.user).filter((value): value is string => typeof value === "string" && value.length > 0);

  if (!users.length) {
    return [];
  }

  const [publisherRows, userAgentRows] = await Promise.all([
    statEventRepository.groupBy({
      by: ["user", "from_publisher_name"],
      where: { ...where, user: { in: users } },
      _count: { _all: true },
    } as any),
    statEventRepository.groupBy({
      by: ["user", "user_agent"],
      where: { ...where, user: { in: users } },
      _count: { _all: true },
    } as any),
  ]);

  const aggregateByUser = (rows: any[], field: string, options: { skipNullKeys?: boolean } = {}) => {
    const { skipNullKeys = false } = options;
    const buckets = new Map<string, WarningBotAggregationBucket[]>();
    rows.forEach((row) => {
      const user = row.user as string | null;
      if (!user) {
        return;
      }
      const rawKey = row[field];
      if (skipNullKeys && (rawKey === null || rawKey === undefined)) {
        return;
      }
      const list = buckets.get(user) ?? [];
      list.push({ key: rawKey ?? "", doc_count: row._count?._all ?? 0 });
      buckets.set(user, list);
    });
    return buckets;
  };

  const publishersByUser = aggregateByUser(publisherRows as any[], "from_publisher_name", {
    skipNullKeys: true,
  });
  const userAgentsByUser = aggregateByUser(userAgentRows as any[], "user_agent");

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
  const where: Prisma.StatEventWhereInput = { user };

  const [typeRows, toRows, fromRows] = await Promise.all([
    statEventRepository.groupBy({
      by: ["type"],
      where,
      _count: { _all: true },
    } as any),
    statEventRepository.groupBy({
      by: ["to_publisher_id"],
      where,
      _count: { _all: true },
    } as any),
    statEventRepository.groupBy({
      by: ["from_publisher_id"],
      where,
      _count: { _all: true },
    } as any),
  ]);

  const mapAggregationRow = (row: any, field: string): WarningBotAggregationBucket => ({
    key: row[field] ?? "",
    doc_count: row._count?._all ?? 0,
  });

  return {
    type: (typeRows as any[]).map((row) => mapAggregationRow(row, "type")),
    publisherTo: (toRows as any[]).map((row) => mapAggregationRow(row, "to_publisher_id")),
    publisherFrom: (fromRows as any[]).map((row) => mapAggregationRow(row, "from_publisher_id")),
  };
}

async function updateStatEventsBotFlagForUser(user: string, isBot: boolean): Promise<void> {
  await statEventRepository.updateMany({ where: { user }, data: { is_bot: isBot } });
}

function createEmptyAggregations(): MissionStatsAggregations {
  return DEFAULT_TYPES.reduce((acc, type) => {
    acc[type] = { eventCount: 0, missionCount: 0 };
    return acc;
  }, {} as MissionStatsAggregations);
}

async function aggregateStatEventsForMission({
  from,
  to,
  toPublisherName,
  excludeToPublisherName,
  excludeUsers = [],
}: AggregateMissionStatsParams): Promise<MissionStatsAggregations> {
  const baseWhere: Prisma.StatEventWhereInput = {
    created_at: { gte: from, lt: to },
  };

  const andConditions: Prisma.StatEventWhereInput[] = [];

  if (toPublisherName) {
    andConditions.push({ to_publisher_name: toPublisherName });
  }

  if (excludeToPublisherName) {
    andConditions.push({ NOT: { to_publisher_name: excludeToPublisherName } });
  }

  if (excludeUsers.length) {
    andConditions.push({ NOT: { user: { in: excludeUsers } } });
  }

  if (andConditions.length) {
    baseWhere.AND = andConditions;
  }

  const result = createEmptyAggregations();

  await Promise.all(
    DEFAULT_TYPES.map(async (type) => {
      const where: Prisma.StatEventWhereInput = {
        ...baseWhere,
        type: type as StatEventType,
      };

      const [eventCount, missionCount] = await Promise.all([
        statEventRepository.count({ where }),
        statEventRepository.count({
          where: { ...where, mission_id: { not: null } },
          distinct: ["mission_id"],
        } as any),
      ]);

      result[type] = { eventCount, missionCount };
    })
  );

  return result;
}

async function findStatEventMissionStatsWithDetails(
  missionId: string
): Promise<{ clicks: StatEventMissionStatsDetails[]; applications: StatEventMissionStatsDetails[] }> {
  const [applications, clicks] = await Promise.all([
    statEventRepository.groupBy({
      by: ["from_publisher_id", "from_publisher_name"],
      where: {
        mission_id: missionId,
        is_bot: false,
        type: "apply",
      },
      _count: { _all: true },
    } as Prisma.StatEventGroupByArgs),
    statEventRepository.groupBy({
      by: ["from_publisher_id", "from_publisher_name"],
      where: {
        mission_id: missionId,
        is_bot: false,
        type: "click",
      },
      _count: { _all: true },
    } as Prisma.StatEventGroupByArgs),
  ]);

  const mapGroup = (group: { from_publisher_id: string | null; from_publisher_name: string | null; _count: { _all: number } }): StatEventMissionStatsDetails => ({
    key: group.from_publisher_id ?? "",
    name: group.from_publisher_name ?? undefined,
    logo: undefined,
    url: undefined,
    doc_count: group._count._all,
  });

  return {
    applications: applications.map(mapGroup),
    clicks: clicks.map(mapGroup),
  };
}

async function findStatEventMissionStatsSummary(
  missionId: string
): Promise<{ clicks: StatEventMissionStatsSummary[]; applications: StatEventMissionStatsSummary[] }> {
  const [clicks, applications] = await Promise.all([
    statEventRepository.groupBy({
      by: ["from_publisher_name"],
      where: {
        mission_id: missionId,
        is_bot: false,
        type: "click",
      },
      _count: { _all: true },
    } as Prisma.StatEventGroupByArgs),
    statEventRepository.groupBy({
      by: ["from_publisher_name"],
      where: {
        mission_id: missionId,
        is_bot: false,
        type: "apply",
      },
      _count: { _all: true },
    } as Prisma.StatEventGroupByArgs),
  ]);

  const mapGroup = (group: { from_publisher_name: string | null; _count: { _all: number } }): StatEventMissionStatsSummary => ({
    key: group.from_publisher_name ?? "",
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
    sharedFilters.push({ OR: [{ is_bot: true }, { is_human: true }] });
  }

  if (filters?.exportToPgStatusMissing) {
    sharedFilters.push({ export_to_analytics: null });
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
        { created_at: { gt: cursorDate } },
        {
          AND: [{ created_at: { equals: cursorDate } }, { id: { gt: parsedCursor.id } }],
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
      orderBy: [{ created_at: "asc" }, { id: "asc" }],
      take: batchSize,
    }),
    cursor ? Promise.resolve(0) : statEventRepository.count({ where: whereForCount }),
  ]);

  const nextCursor =
    rows.length < batchSize
      ? null
      : JSON.stringify({
          createdAt: rows[rows.length - 1].created_at.toISOString(),
          id: rows[rows.length - 1].id,
        });

  return {
    events: rows.map(fromPg),
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
    data: { export_to_analytics: status },
  });
}

function toPgColumnName(field: string): string | null {
  if (typeof field !== "string" || field.length === 0) {
    return null;
  }

  const placeholderValue = "__pg_column__";
  const mapped = toPg({ [field]: placeholderValue } as Partial<StatEventRecord>, { includeDefaults: false });
  const [column] = Object.keys(mapped);

  return column ?? null;
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
  findStatEventWarningBotCandidatesSince,
  aggregateStatEventWarningBotByUser,
  updateStatEventsBotFlagForUser,
  hasStatEventWithRecentClickId,
};

export default statEventService;
