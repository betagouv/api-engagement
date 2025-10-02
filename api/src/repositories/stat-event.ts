import { v4 as uuidv4 } from "uuid";

import { Prisma } from "../db/core";

import { STATS_INDEX } from "../config";
import esClient from "../db/elastic";
import { prismaCore } from "../db/postgres";
import { EsQuery, Stats } from "../types";

type StatEventType = Stats["type"];

type WarningBotAggregationBucket = { key: string; doc_count: number };

interface WarningBotAggregations {
  type: WarningBotAggregationBucket[];
  publisherTo: WarningBotAggregationBucket[];
  publisherFrom: WarningBotAggregationBucket[];
}

interface CountByTypeParams {
  publisherId: string;
  from: Date;
  types?: StatEventType[];
}

interface CountEventsParams {
  type?: StatEventType;
  user?: string;
  clickUser?: string;
  from?: Date;
}

interface UpdateStatEventOptions {
  retryOnConflict?: number;
}

interface HasRecentStatEventWithClickIdParams {
  type: StatEventType;
  clickId: string;
  since: Date;
}

interface CountClicksByPublisherForOrganizationSinceParams {
  publisherIds: string[];
  organizationClientId: string;
  from: Date;
}

interface SearchStatEventsParams {
  fromPublisherId?: string;
  toPublisherId?: string;
  type?: StatEventType;
  sourceId?: string;
  size?: number;
  skip?: number;
}

interface SearchStatEventsResult {
  data: Stats[];
  total: number;
}

type ViewStatsDateFilter = {
  operator: "gt" | "lt";
  date: Date;
};

interface ViewStatsFilters {
  fromPublisherName?: string;
  toPublisherName?: string;
  fromPublisherId?: string;
  toPublisherId?: string;
  missionDomain?: string;
  type?: string;
  source?: string;
  createdAt?: ViewStatsDateFilter[];
}

interface SearchViewStatsParams {
  publisherId: string;
  size?: number;
  filters?: ViewStatsFilters;
  facets?: string[];
}

type ViewStatsFacet = { key: string; doc_count: number };

interface SearchViewStatsResult {
  total: number;
  facets: Record<string, ViewStatsFacet[]>;
}

const DEFAULT_TYPES: StatEventType[] = ["click", "print", "apply", "account"];

interface AggregateMissionStatsParams {
  from: Date;
  to: Date;
  toPublisherName?: string;
  excludeToPublisherName?: string;
  excludeUsers?: string[];
}

interface ScrollStatEventsFilters {
  exportToPgStatusMissing?: boolean;
  hasBotOrHumanFlag?: boolean;
}

interface ScrollStatEventsParams {
  type: StatEventType;
  batchSize?: number;
  cursor?: string | null;
  filters?: ScrollStatEventsFilters;
  sourceFields?: string[];
}

interface ScrollStatEventsResult {
  events: Stats[];
  cursor: string | null;
  total: number;
}

export interface MissionStatsAggregationBucket {
  eventCount: number;
  missionCount: number;
}

export type MissionStatsAggregations = Record<StatEventType, MissionStatsAggregationBucket>;

interface FindWarningBotCandidatesParams {
  from: Date;
  minClicks: number;
}

interface WarningBotCandidate {
  user: string;
  clickCount: number;
  publishers: WarningBotAggregationBucket[];
  userAgents: WarningBotAggregationBucket[];
}

function toPg(data: Partial<Stats>, options: { includeDefaults?: boolean } = {}) {
  const { includeDefaults = true } = options;
  const mapped: any = {
    type: data.type,
    created_at: data.createdAt,
    click_user: data.clickUser,
    click_id: data.clickId,
    request_id: data.requestId,
    origin: data.origin,
    referer: data.referer,
    user_agent: data.userAgent,
    host: data.host,
    user: data.user,
    is_bot: data.isBot,
    is_human: includeDefaults ? (data.isHuman ?? false) : data.isHuman,
    source: includeDefaults ? (data.source ?? "publisher") : data.source,
    source_id: includeDefaults ? (data.sourceId ?? "") : data.sourceId,
    source_name: includeDefaults ? (data.sourceName ?? "") : data.sourceName,
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
    tags: data.tags,
    export_to_analytics: data.exportToAnalytics,
  };
  Object.keys(mapped).forEach((key) => mapped[key] === undefined && delete mapped[key]);
  return mapped;
}

// Map to Elasticsearch document by removing reserved/internal fields.
function toEs(data: Partial<Stats>) {
  const { _id, ...rest } = data as any;
  return rest;
}

function fromPg(row: any): Stats {
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
  } as Stats;
}

export async function createStatEvent(event: Stats): Promise<string> {
  // Render id here to share it between es and pg
  const id = event._id || uuidv4();

  const shouldWriteEs = getWriteStatsDual() || getReadStatsFrom() === "es";
  const shouldWritePg = getWriteStatsDual() || getReadStatsFrom() === "pg";

  if (shouldWriteEs) {
    await esClient.index({ index: STATS_INDEX, id, body: toEs(event) });
  }

  if (shouldWritePg) {
    try {
      await prismaCore.statEvent.create({ data: { id, ...toPg(event) } });
    } catch (error) {
      console.error(`[StatEvent] Error creating stat event ${id} in Postgres:`, error);
    }
  }

  return id;
}

export async function updateStatEventById(id: string, patch: Partial<Stats>, options: UpdateStatEventOptions = {}) {
  const data = toPg(patch, { includeDefaults: false });
  const { retryOnConflict } = options;

  const shouldWriteEs = getWriteStatsDual() || getReadStatsFrom() === "es";
  const shouldWritePg = getWriteStatsDual() || getReadStatsFrom() === "pg";

  if (shouldWriteEs) {
    await esClient.update({ index: STATS_INDEX, id, body: { doc: patch }, retry_on_conflict: retryOnConflict });
  }

  if (shouldWritePg) {
    try {
      await prismaCore.statEvent.update({ where: { id }, data });
    } catch (error) {
      console.error(`[StatEvent] Error updating stat event ${id} in Postgres:`, error);
    }
  }
}

export async function getStatEventById(id: string): Promise<Stats | null> {
  if (getReadStatsFrom() === "pg") {
    try {
      const pgRes = await prismaCore.statEvent.findUnique({ where: { id } });
      if (pgRes) {
        return fromPg(pgRes);
      }
    } catch (error) {
      console.error(`[StatEvent] Error fetching stat event ${id} from Postgres:`, error);
    }
  }

  try {
    const esRes = await esClient.get({ index: STATS_INDEX, id });
    return { ...esRes.body._source, _id: esRes.body._id } as Stats;
  } catch {
    return null;
  }
}

export async function count() {
  if (getReadStatsFrom() === "pg") {
    return prismaCore.statEvent.count();
  }
  const { body } = await esClient.count({ index: STATS_INDEX });
  return body.count as number;
}

export async function findFirstByMissionId(missionId: string): Promise<Stats | null> {
  if (getReadStatsFrom() === "pg") {
    const pgRes = await prismaCore.statEvent.findFirst({
      where: { mission_id: missionId },
      orderBy: { created_at: "desc" },
    });
    return pgRes ? fromPg(pgRes) : null;
  }

  const esRes = await esClient.search({
    index: STATS_INDEX,
    body: {
      query: { term: { "missionId.keyword": missionId } },
      size: 1,
    },
  });

  const hit = esRes.body.hits?.hits?.[0];
  if (!hit) {
    return null;
  }

  return { _id: hit._id, ...hit._source } as Stats;
}

export async function countByTypeSince({ publisherId, from, types }: CountByTypeParams) {
  const statTypes = types?.length ? types : DEFAULT_TYPES;
  const counts: Record<StatEventType, number> = {
    click: 0,
    print: 0,
    apply: 0,
    account: 0,
  };

  if (getReadStatsFrom() === "pg") {
    await Promise.all(
      statTypes.map(async (type) => {
        const total = await prismaCore.statEvent.count({
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

  const aggs = statTypes.reduce(
    (acc, type) => {
      acc[type] = { filter: { term: { "type.keyword": type } } };
      return acc;
    },
    {} as Record<string, { filter: { term: { "type.keyword": StatEventType } } }>
  );

  const response = await esClient.search({
    index: STATS_INDEX,
    body: {
      query: {
        bool: {
          must: [{ term: { "toPublisherId.keyword": publisherId } }, { range: { createdAt: { gte: from } } }],
        },
      },
      aggs,
      size: 0,
    },
  });

  const aggregations = response.body.aggregations ?? {};
  statTypes.forEach((type) => {
    const bucket = aggregations[type as keyof typeof aggregations] as { doc_count?: number } | undefined;
    counts[type] = bucket?.doc_count ?? 0;
  });

  return counts;
}

export async function countEvents({ type, user, clickUser, from }: CountEventsParams): Promise<number> {
  if (getReadStatsFrom() === "pg") {
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

    return prismaCore.statEvent.count({ where });
  }

  const filters: any[] = [];

  if (type) {
    filters.push({ term: { "type.keyword": type } });
  }

  if (user) {
    filters.push({ term: { "user.keyword": user } });
  }

  if (clickUser) {
    filters.push({ term: { "clickUser.keyword": clickUser } });
  }

  if (from) {
    filters.push({ range: { createdAt: { gte: from.toISOString() } } });
  }

  const queryBody = filters.length > 0 ? { bool: { filter: filters } } : { match_all: {} };

  const res = await esClient.count({ index: STATS_INDEX, body: { query: queryBody } });
  return res.body.count ?? 0;
}

export async function hasRecentStatEventWithClickId({ type, clickId, since }: HasRecentStatEventWithClickIdParams): Promise<boolean> {
  const shouldCheckPg = getWriteStatsDual() || getReadStatsFrom() === "pg";

  if (shouldCheckPg) {
    try {
      const total = await prismaCore.statEvent.count({
        where: {
          type: type as any,
          click_id: clickId,
          created_at: { gte: since },
        },
      });
      if (total > 0) {
        return true;
      }
    } catch (error) {
      console.error(`[StatEvent] Error counting stat events for click ${clickId} in Postgres:`, error);
    }
  }

  const query: EsQuery = {
    bool: {
      must: [
        { term: { "type.keyword": type } },
        { term: { "clickId.keyword": clickId } },
        { range: { createdAt: { gte: since.toISOString() } } },
      ],
      must_not: [],
      should: [],
      filter: [],
    },
  };

  try {
    const { body: countBody } = await esClient.count({ index: STATS_INDEX, body: { query } });
    return (countBody.count as number) > 0;
  } catch (error) {
    console.error(`[StatEvent] Error counting stat events for click ${clickId} in Elasticsearch:`, error);
    return false;
  }
}

export async function countClicksByPublisherForOrganizationSince({ publisherIds, organizationClientId, from }: CountClicksByPublisherForOrganizationSinceParams) {
  if (!publisherIds.length) {
    return {} as Record<string, number>;
  }

  if (getReadStatsFrom() === "pg") {
    const rows = (await prismaCore.statEvent.groupBy({
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

  const response = await esClient.search({
    index: STATS_INDEX,
    body: {
      query: {
        bool: {
          filter: [
            { term: { "type.keyword": "click" } },
            { terms: { "fromPublisherId.keyword": publisherIds } },
            { term: { missionOrganizationClientId: organizationClientId } },
            { range: { createdAt: { gte: from.toISOString() } } },
          ],
          must_not: [{ term: { isBot: true } }],
        },
      },
      aggs: {
        fromPublisherId: {
          terms: { field: "fromPublisherId.keyword", size: publisherIds.length },
        },
      },
      size: 0,
    },
  });

  const buckets: { key: string; doc_count: number }[] = (response.body.aggregations?.fromPublisherId?.buckets as { key: string; doc_count: number }[]) ?? [];

  return buckets.reduce<Record<string, number>>(
    (acc, bucket) => {
      acc[bucket.key] = bucket.doc_count;
      return acc;
    },
    {} as Record<string, number>
  );
}

export async function searchStatEvents({ fromPublisherId, toPublisherId, type, sourceId, size = 25, skip = 0 }: SearchStatEventsParams): Promise<SearchStatEventsResult> {
  if (getReadStatsFrom() === "pg") {
    const where: Prisma.StatEventWhereInput = {
      NOT: { is_bot: true },
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

    const [rows, total] = await Promise.all([
      prismaCore.statEvent.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take: size,
      }),
      prismaCore.statEvent.count({ where }),
    ]);

    return {
      data: rows.map(fromPg),
      total,
    };
  }

  const query: EsQuery = {
    bool: {
      must: [],
      must_not: [{ term: { isBot: true } }],
      should: [],
      filter: [],
    },
  };

  if (fromPublisherId) {
    query.bool.filter.push({ term: { fromPublisherId } });
  }

  if (toPublisherId) {
    query.bool.filter.push({ term: { toPublisherId } });
  }

  if (type) {
    query.bool.filter.push({ term: { type } });
  }

  if (sourceId) {
    query.bool.filter.push({ term: { sourceId } });
  }

  const response = await esClient.search({
    index: STATS_INDEX,
    body: {
      track_total_hits: true,
      query,
      sort: [{ createdAt: { order: "desc" } }],
      size,
      from: skip,
    },
  });

  const hits = (response.body.hits?.hits as any[]) ?? [];

  return {
    data: hits.map((hit) => ({ ...hit._source, _id: hit._id }) as Stats),
    total: response.body.hits?.total?.value ?? 0,
  };
}

export async function searchViewStats({ publisherId, size = 10, filters = {}, facets = [] }: SearchViewStatsParams): Promise<SearchViewStatsResult> {
  if (getReadStatsFrom() === "pg") {
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

    const total = await prismaCore.statEvent.count({ where });

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
          const rows = (await prismaCore.statEvent.groupBy({
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

  const body: { [key: string]: any } = {
    query: {
      bool: {
        must_not: [{ term: { isBot: true } }],
        must: [],
        should: [{ term: { "toPublisherId.keyword": publisherId } }, { term: { "fromPublisherId.keyword": publisherId } }],
        filter: [],
      },
    },
    size,
    track_total_hits: true,
  };

  const pushTerm = (field: string, value?: string) => {
    if (value) {
      body.query.bool.must.push({ term: { [`${field}.keyword`]: value } });
    }
  };

  pushTerm("fromPublisherName", filters.fromPublisherName);
  pushTerm("toPublisherName", filters.toPublisherName);
  pushTerm("fromPublisherId", filters.fromPublisherId);
  pushTerm("toPublisherId", filters.toPublisherId);
  pushTerm("missionDomain", filters.missionDomain);
  pushTerm("type", filters.type);
  pushTerm("source", filters.source);

  filters.createdAt?.forEach(({ operator, date }) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return;
    }
    if (operator === "gt") {
      body.query.bool.must.push({ range: { createdAt: { gt: date } } });
    }
    if (operator === "lt") {
      body.query.bool.must.push({ range: { createdAt: { lt: date } } });
    }
  });

  if (facets.length) {
    body.aggs = {};
    facets.forEach((facet) => {
      if (typeof facet === "string" && facet) {
        body.aggs[facet] = { terms: { field: `${facet}.keyword`, size } };
      }
    });
  }

  const response = await esClient.search({ index: STATS_INDEX, body });

  const total = response.body.hits.total.value as number;
  const aggregations = response.body.aggregations || {};
  const facetsResult: Record<string, ViewStatsFacet[]> = {};

  Object.keys(aggregations).forEach((key) => {
    const buckets = aggregations[key]?.buckets || [];
    facetsResult[key] = buckets;
  });

  return { total, facets: facetsResult };
}

function mapAggregationRow(row: any, field: string): WarningBotAggregationBucket {
  const value = row[field];
  return {
    key: value ?? "",
    doc_count: row._count?._all ?? 0,
  };
}

export async function findWarningBotCandidatesSince({ from, minClicks }: FindWarningBotCandidatesParams): Promise<WarningBotCandidate[]> {
  if (getReadStatsFrom() === "pg") {
    const where: Prisma.StatEventWhereInput = {
      type: "click" as any,
      created_at: { gte: from },
    };

    const grouped = (await prismaCore.statEvent.groupBy({
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
      prismaCore.statEvent.groupBy({
        by: ["user", "from_publisher_name"],
        where: { ...where, user: { in: users } },
        _count: { _all: true },
      } as any),
      prismaCore.statEvent.groupBy({
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

  const body = {
    size: 0,
    query: {
      bool: {
        must: [{ range: { createdAt: { gte: from } } }, { term: { "type.keyword": "click" } }],
      },
    },
    aggs: {
      by_user: {
        terms: {
          field: "user.keyword",
          min_doc_count: minClicks,
          size: 1000,
        },
        aggs: {
          clicks: {
            filter: { term: { "type.keyword": "click" } },
          },
          publishers: {
            terms: { field: "fromPublisherName.keyword", size: 10 },
          },
          userAgent: {
            terms: { field: "userAgent.keyword", size: 10 },
          },
        },
      },
    },
  } as const;

  const response = await esClient.search({ index: STATS_INDEX, body });
  const buckets = (response.body.aggregations?.by_user?.buckets ?? []) as any[];

  return buckets.map((bucket) => ({
    user: bucket.key as string,
    clickCount: bucket.clicks?.doc_count ?? bucket.doc_count ?? 0,
    publishers: ((bucket.publishers?.buckets as any[]) ?? []).map((publisherBucket) => ({
      key: publisherBucket.key,
      doc_count: publisherBucket.doc_count,
    })),
    userAgents: ((bucket.userAgent?.buckets as any[]) ?? []).map((userAgentBucket) => ({
      key: userAgentBucket.key,
      doc_count: userAgentBucket.doc_count,
    })),
  }));
}

async function aggregateWarningBotStatsByUser(user: string): Promise<WarningBotAggregations> {
  if (getReadStatsFrom() === "pg") {
    const where: Prisma.StatEventWhereInput = { user };

    const [typeRows, toRows, fromRows] = await Promise.all([
      prismaCore.statEvent.groupBy({
        by: ["type"],
        where,
        _count: { _all: true },
      } as any),
      prismaCore.statEvent.groupBy({
        by: ["to_publisher_id"],
        where,
        _count: { _all: true },
      } as any),
      prismaCore.statEvent.groupBy({
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

  const response = await esClient.search({
    index: STATS_INDEX,
    body: {
      query: {
        term: { user },
      },
      size: 0,
      aggs: {
        type: { terms: { field: "type.keyword" } },
        publisherTo: { terms: { field: "toPublisherId.keyword" } },
        publisherFrom: { terms: { field: "fromPublisherId.keyword" } },
      },
    },
  });

  const aggregations = response.body.aggregations ?? {};

  const getBuckets = (key: string) =>
    ((aggregations[key] as { buckets?: WarningBotAggregationBucket[] } | undefined)?.buckets ?? []).map((bucket) => ({
      key: bucket.key,
      doc_count: bucket.doc_count,
    }));

  return {
    type: getBuckets("type"),
    publisherTo: getBuckets("publisherTo"),
    publisherFrom: getBuckets("publisherFrom"),
  };
}

async function updateIsBotForUser(user: string, isBot: boolean): Promise<void> {
  const promises: Promise<unknown>[] = [
    esClient.updateByQuery({
      index: STATS_INDEX,
      body: {
        query: { term: { user } },
        script: {
          lang: "painless",
          source: "ctx._source.isBot = params.isBot;",
          params: { isBot },
        },
      },
    }),
  ];

  if (getWriteStatsDual()) {
    promises.push(prismaCore.statEvent.updateMany({ where: { user }, data: { is_bot: isBot } }));
  }

  await Promise.all(promises);
}

function createEmptyAggregations(): MissionStatsAggregations {
  return DEFAULT_TYPES.reduce((acc, type) => {
    acc[type] = { eventCount: 0, missionCount: 0 };
    return acc;
  }, {} as MissionStatsAggregations);
}

export async function aggregateMissionStats({
  from,
  to,
  toPublisherName,
  excludeToPublisherName,
  excludeUsers = [],
}: AggregateMissionStatsParams): Promise<MissionStatsAggregations> {
  if (getReadStatsFrom() === "pg") {
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
          prismaCore.statEvent.count({ where }),
          prismaCore.statEvent.count({
            where: { ...where, mission_id: { not: null } },
            distinct: ["mission_id"],
          } as any),
        ]);

        result[type] = { eventCount, missionCount };
      })
    );

    return result;
  }

  const filter: any[] = [{ range: { createdAt: { gte: from.toISOString(), lt: to.toISOString() } } }];

  if (toPublisherName) {
    filter.push({ term: { "toPublisherName.keyword": toPublisherName } });
  }

  const mustNot: any[] = [];

  if (excludeToPublisherName) {
    mustNot.push({ term: { "toPublisherName.keyword": excludeToPublisherName } });
  }

  if (excludeUsers.length) {
    mustNot.push({ terms: { "user.keyword": excludeUsers } });
  }

  const aggs = DEFAULT_TYPES.reduce(
    (acc, type) => {
      acc[type] = {
        filter: { term: { "type.keyword": type } },
        aggs: {
          data: { cardinality: { field: "missionId.keyword" } },
        },
      };
      return acc;
    },
    {} as Record<StatEventType, unknown>
  );

  const query: any = { bool: { filter } };

  if (mustNot.length) {
    query.bool.must_not = mustNot;
  }

  const response = await esClient.search({
    index: STATS_INDEX,
    body: {
      query,
      aggs,
      size: 0,
    },
  });

  const aggregations = response.body.aggregations ?? {};
  const result = createEmptyAggregations();

  DEFAULT_TYPES.forEach((type) => {
    const bucket = aggregations[type as keyof typeof aggregations] as { doc_count?: number; data?: { value?: number } } | undefined;
    result[type] = {
      eventCount: bucket?.doc_count ?? 0,
      missionCount: bucket?.data?.value ?? 0,
    };
  });

  return result;
}

function buildScrollFilters(filters: ScrollStatEventsFilters | undefined) {
  const filter: any[] = [];
  const mustNot: any[] = [];

  if (!filters) {
    return { filter, mustNot };
  }

  if (filters.hasBotOrHumanFlag) {
    filter.push({
      bool: {
        should: [{ term: { isBot: true } }, { term: { isHuman: true } }],
        minimum_should_match: 1,
      },
    });
  }

  if (filters.exportToPgStatusMissing) {
    mustNot.push({ exists: { field: "exportToPgStatus" } });
  }

  return { filter, mustNot };
}

export async function scrollStatEvents({ type, batchSize = 5000, cursor = null, filters, sourceFields }: ScrollStatEventsParams): Promise<ScrollStatEventsResult> {
  if (getReadStatsFrom() === "pg") {
    type PgCursor = { createdAt: string; id: string };

    let parsedCursor: PgCursor | null = null;
    if (cursor) {
      try {
        const rawCursor = JSON.parse(cursor);
        if (rawCursor && typeof rawCursor === "object" && typeof rawCursor.createdAt === "string" && typeof rawCursor.id === "string") {
          parsedCursor = rawCursor as PgCursor;
        }
      } catch (error) {
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
      prismaCore.statEvent.findMany({
        where: whereForRows,
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        take: batchSize,
      }),
      cursor ? Promise.resolve(0) : prismaCore.statEvent.count({ where: whereForCount }),
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

  if (cursor) {
    const { body } = await esClient.scroll({
      scroll: "20m",
      scroll_id: cursor,
    });

    const hits = (body.hits?.hits as { _id: string; _source: Stats }[]) ?? [];

    return {
      events: hits.map((hit) => ({ ...hit._source, _id: hit._id }) as Stats),
      cursor: body._scroll_id ?? null,
      total: body.hits?.total?.value ?? 0,
    };
  }

  const { filter, mustNot } = buildScrollFilters(filters);
  filter.unshift({ term: { "type.keyword": type } });

  const { body } = await esClient.search({
    index: STATS_INDEX,
    scroll: "20m",
    size: batchSize,
    body: {
      query: {
        bool: {
          filter,
          must_not: mustNot,
        },
      },
    },
    track_total_hits: true,
    _source: sourceFields,
  });

  const hits = (body.hits?.hits as { _id: string; _source: Stats }[]) ?? [];

  return {
    events: hits.map((hit) => ({ ...hit._source, _id: hit._id }) as Stats),
    cursor: body._scroll_id ?? null,
    total: body.hits?.total?.value ?? 0,
  };
}

export async function setStatEventsExportStatus(ids: string[], status: "SUCCESS" | "FAILURE") {
  if (!ids.length) {
    return;
  }

  await esClient.bulk({
    refresh: false,
    body: ids.flatMap((id) => [{ update: { _index: STATS_INDEX, _id: id } }, { doc: { exportToPgStatus: status } }]),
  });

  if (getWriteStatsDual()) {
    await prismaCore.statEvent.updateMany({
      where: { id: { in: ids } },
      data: { export_to_analytics: status },
    });
  }
}

// Helpers to evaluate feature flags
function getReadStatsFrom(): "es" | "pg" {
  return (process.env.READ_STATS_FROM as "es" | "pg") || "es";
}

function getWriteStatsDual(): boolean {
  return process.env.WRITE_STATS_DUAL === "true";
}

function toPgColumnName(field: string): string | null {
  if (typeof field !== "string" || field.length === 0) {
    return null;
  }

  const placeholderValue = "__pg_column__";
  const mapped = toPg({ [field]: placeholderValue } as Partial<Stats>, { includeDefaults: false });
  const [column] = Object.keys(mapped);

  return column ?? null;
}

const statEventRepository = {
  createStatEvent,
  updateStatEventById,
  getStatEventById,
  count,
  countByTypeSince,
  countEvents,
  countClicksByPublisherForOrganizationSince,
  searchStatEvents,
  searchViewStats,
  aggregateMissionStats,
  findFirstByMissionId,
  scrollStatEvents,
  setStatEventsExportStatus,
  findWarningBotCandidatesSince,
  aggregateWarningBotStatsByUser,
  updateIsBotForUser,
  hasRecentStatEventWithClickId,
};

export default statEventRepository;
