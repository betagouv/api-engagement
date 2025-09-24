import { v4 as uuidv4 } from "uuid";

import type { Prisma } from "@prisma/client";

import { STATS_INDEX } from "../config";
import esClient from "../db/elastic";
import { prismaCore } from "../db/postgres";
import { Stats } from "../types";

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
        type: "click",
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

function createEmptyAggregations(): MissionStatsAggregations {
  return DEFAULT_TYPES.reduce((acc, type) => {
    acc[type] = { eventCount: 0, missionCount: 0 };
    return acc;
  }, {} as MissionStatsAggregations);
}

export async function aggregateMissionStats({ from, to, toPublisherName, excludeToPublisherName, excludeUsers = [] }: AggregateMissionStatsParams): Promise<MissionStatsAggregations> {
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
          type: type as Prisma.StatEventType,
        };

        const [eventCount, missionCount] = await Promise.all([
          prismaCore.statEvent.count({ where }),
          prismaCore.statEvent.count({
            where: { ...where, mission_id: { not: null } },
            distinct: ["mission_id"] as Prisma.StatEventScalarFieldEnum[],
          }),
        ]);

        result[type] = { eventCount, missionCount };
      })
    );

    return result;
  }

  const filter: any[] = [
    { range: { createdAt: { gte: from.toISOString(), lt: to.toISOString() } } },
  ];

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

const statEventRepository = {
  createStatEvent,
  updateStatEventById,
  getStatEventById,
  count,
  countByTypeSince,
  countClicksByPublisherForOrganizationSince,
  aggregateMissionStats,
};

export default statEventRepository;

// Helpers to evaluate feature flags
function getReadStatsFrom(): "es" | "pg" {
  return (process.env.READ_STATS_FROM as "es" | "pg") || "es";
}

function getWriteStatsDual(): boolean {
  return process.env.WRITE_STATS_DUAL === "true";
}
