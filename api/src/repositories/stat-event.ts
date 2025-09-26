import { v4 as uuidv4 } from "uuid";

import { Prisma } from "../db/core";

import { STATS_INDEX } from "../config";
import esClient from "../db/elastic";
import { prismaCore } from "../db/postgres";
import { EsQuery, Stats } from "../types";

type StatEventType = Stats["type"];

interface CountByTypeParams {
  publisherId: string;
  from: Date;
  types?: StatEventType[];
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

export interface MissionStatsAggregationBucket {
  eventCount: number;
  missionCount: number;
}

export type MissionStatsAggregations = Record<StatEventType, MissionStatsAggregationBucket>;

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
  } as Stats;
}

export async function createStatEvent(event: Stats): Promise<string> {
  // Render id here to share it between es and pg
  const id = event._id || uuidv4();
  if (getReadStatsFrom() === "pg") {
    await prismaCore.statEvent.create({ data: { id, ...toPg(event) } });
    if (getWriteStatsDual()) {
      await esClient.index({ index: STATS_INDEX, id, body: toEs(event) });
    }
    return id;
  }
  await esClient.index({ index: STATS_INDEX, id, body: toEs(event) });
  if (getWriteStatsDual()) {
    await prismaCore.statEvent.create({ data: { id, ...toPg(event) } });
  }
  return id;
}

export async function updateStatEventById(id: string, patch: Partial<Stats>) {
  const data = toPg(patch, { includeDefaults: false });
  if (getReadStatsFrom() === "pg") {
    await prismaCore.statEvent.update({ where: { id }, data });
    if (getWriteStatsDual()) {
      await esClient.update({ index: STATS_INDEX, id, body: { doc: patch } });
    }
    return;
  }
  await esClient.update({ index: STATS_INDEX, id, body: { doc: patch } });
  if (getWriteStatsDual()) {
    try {
      await prismaCore.statEvent.update({ where: { id }, data });
    } catch (error) {
      console.error(`[StatEvent] Error updating stat event ${id}:`, error);
    }
  }
}

export async function getStatEventById(id: string): Promise<Stats | null> {
  if (getReadStatsFrom() === "pg") {
    const pgRes = await prismaCore.statEvent.findUnique({ where: { id } });
    return pgRes ? fromPg(pgRes) : null;
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

export async function searchStatEvents({
  fromPublisherId,
  toPublisherId,
  type,
  sourceId,
  size = 25,
  skip = 0,
}: SearchStatEventsParams): Promise<SearchStatEventsResult> {
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
    data: hits.map((hit) => ({ ...hit._source, _id: hit._id } as Stats)),
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
  countClicksByPublisherForOrganizationSince,
  searchStatEvents,
  searchViewStats,
  aggregateMissionStats,
  findFirstByMissionId,
};

export default statEventRepository;
