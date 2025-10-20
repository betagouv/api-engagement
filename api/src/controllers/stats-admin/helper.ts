import { STATS_INDEX } from "../../config";
import { Prisma } from "../../db/core";
import esClient from "../../db/elastic";
import { prismaCore } from "../../db/postgres";
import MissionModel from "../../models/mission";
import PublisherModel from "../../models/publisher";
import { EsQuery } from "../../types";

const SERVICE_CIVIQUE = "Service Civique";
// Note: stats-admin endpoints rely on the StatsAdminEvents materialized view refreshed by the
// update-stats-views job.
const STATS_ADMIN_EVENTS_VIEW = Prisma.raw('"StatsAdminEvents"');

type MissionTypeFilter = "volontariat" | "benevolat";

interface ViewsParams {
  type?: MissionTypeFilter;
  from?: Date;
  to?: Date;
}

type PublisherViewsSourceFilter = "widget" | "campaign" | "publisher";

interface PublisherViewsParams {
  from?: Date;
  to?: Date;
  broadcaster?: string;
  announcer?: string;
  type?: "volontariat" | "benevolat" | "";
  source?: PublisherViewsSourceFilter | "";
}

interface PublisherViewsResponse {
  data: Array<{
    _id: string;
    name: string;
    isAnnonceur?: boolean;
    hasApiRights?: boolean;
    hasCampaignRights?: boolean;
    hasWidgetRights?: boolean;
    clickFrom: number;
    clickTo: number;
    applyFrom: number;
    applyTo: number;
  }>;
  total: {
    publishers: number;
    announcers: number;
    broadcasters: number;
    clicks: number;
    applys: number;
  };
}

interface AdminPublisherViewsParams {
  from?: Date;
  to?: Date;
  broadcasterIds?: string[];
  announcerIds?: string[];
  missionType?: MissionTypeFilter;
  source?: PublisherViewsSourceFilter;
}

interface AdminPublisherViewsResult {
  clickFrom: Record<string, number>;
  clickTo: Record<string, number>;
  applyFrom: Record<string, number>;
  applyTo: Record<string, number>;
  totalClick: number;
  totalApply: number;
}

export async function getCreatedMissionsStats(params: ViewsParams) {
  const { from, to } = params;

  const interval: "day" | "month" = from && to ? ((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24) > 62 ? "month" : "day") : "month";

  const createdFacet = await MissionModel.aggregate([
    {
      $match: {
        createdAt: {
          $gte: from,
          $lte: to,
        },
      },
    },
    {
      $facet: {
        total: [{ $count: "total" }],
        volontariat: [{ $match: { publisherName: SERVICE_CIVIQUE } }, { $count: "total" }],
        benevolat: [{ $match: { publisherName: { $ne: SERVICE_CIVIQUE } } }, { $count: "total" }],
        histogram: [
          {
            $group: {
              _id: {
                $dateToString: {
                  format: interval === "day" ? "%Y-%m-%d" : "%Y-%m",
                  date: "$createdAt",
                },
              },
              total: { $sum: 1 },
              volontariat: {
                $sum: { $cond: [{ $eq: ["$publisherName", SERVICE_CIVIQUE] }, 1, 0] },
              },
              benevolat: {
                $sum: { $cond: [{ $ne: ["$publisherName", SERVICE_CIVIQUE] }, 1, 0] },
              },
            },
          },
          { $sort: { _id: 1 } },
        ],
      },
    },
  ]);

  const activeFacet = await MissionModel.aggregate([
    {
      $match: {
        $or: [{ deletedAt: { $gte: from } }, { deleted: false }],
        createdAt: { $lte: to },
      },
    },
    {
      $facet: {
        total: [{ $count: "total" }],
        volontariat: [{ $match: { publisherName: SERVICE_CIVIQUE } }, { $count: "total" }],
        benevolat: [{ $match: { publisherName: { $ne: SERVICE_CIVIQUE } } }, { $count: "total" }],
      },
    },
  ]);

  return {
    activeVolontariatMissions: activeFacet[0].volontariat.length ? activeFacet[0].volontariat[0].total || 0 : 0,
    activeBenevolatMissions: activeFacet[0].benevolat.length ? activeFacet[0].benevolat[0].total || 0 : 0,
    totalActiveMissions: activeFacet[0].total.length ? activeFacet[0].total[0].total || 0 : 0,
    totalMission: createdFacet[0].total.length ? createdFacet[0].total[0].total || 0 : 0,
    totalVolontariatMissions: createdFacet[0].volontariat.length ? createdFacet[0].volontariat[0].total || 0 : 0,
    totalBenevolatMissions: createdFacet[0].benevolat.length ? createdFacet[0].benevolat[0].total || 0 : 0,
    histogram: createdFacet[0].histogram.map((bucket: { [key: string]: any }) => ({
      key: new Date(bucket._id),
      doc_count: bucket.total,
      volontariat: bucket.volontariat,
      benevolat: bucket.benevolat,
    })),
  };
}

export async function getActiveMissionsStats(params: Required<Pick<ViewsParams, "from" | "to">> & { type?: MissionTypeFilter }) {
  const { type, from, to } = params;

  const where = {
    $or: [{ deletedAt: { $gte: from } }, { deleted: false }],
    createdAt: { $lte: to },
  } as { [key: string]: any };

  if (type === "volontariat") {
    where.publisherName = SERVICE_CIVIQUE;
  } else if (type === "benevolat") {
    where.publisherName = { $ne: SERVICE_CIVIQUE };
  }

  const interval = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24) > 62 ? "month" : "day";
  const $facet = interval === "day" ? buildDaysFacets(from, to) : buildMonthFacets(from, to);

  const activeFacet = await MissionModel.aggregate([{ $match: where }, { $facet }]);

  const histogram = Object.entries(activeFacet[0]).map(([key, value]) => ({
    key: new Date(key.replace("_", ".")).toISOString(),
    doc_count: Array.isArray(value) && value.length ? (value[0] as any).total || 0 : 0,
    benevolat: Array.isArray(value) && value.length ? (value[0] as any).benevolat || 0 : 0,
    volontariat: Array.isArray(value) && value.length ? (value[0] as any).volontariat || 0 : 0,
  }));

  histogram.sort((a, b) => (a.key > b.key ? 1 : -1));

  return { histogram };
}

export async function getPublisherViewsStats(params: PublisherViewsParams): Promise<PublisherViewsResponse> {
  const broadcasterIds = params.broadcaster
    ? params.broadcaster
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length)
    : [];
  const announcerIds = params.announcer
    ? params.announcer
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length)
    : [];

  const missionType = params.type?.length ? (params.type as MissionTypeFilter) : undefined;
  const source = params.source?.length ? (params.source as PublisherViewsSourceFilter) : undefined;

  const stats = await getAdminPublisherViewsStats({
    from: params.from,
    to: params.to,
    broadcasterIds,
    announcerIds,
    missionType,
    source,
  });

  const publishers = await PublisherModel.find().lean();

  const data = publishers.map((p) => ({
    _id: p._id?.toString?.() ?? String(p._id),
    name: p.name,
    isAnnonceur: p.isAnnonceur,
    hasApiRights: p.hasApiRights,
    hasCampaignRights: p.hasCampaignRights,
    hasWidgetRights: p.hasWidgetRights,
    clickFrom: stats.clickFrom[p.name] ?? 0,
    clickTo: stats.clickTo[p.name] ?? 0,
    applyFrom: stats.applyFrom[p.name] ?? 0,
    applyTo: stats.applyTo[p.name] ?? 0,
  }));

  const total = {
    publishers: publishers.length,
    announcers: publishers.filter((e) => {
      if (!e.isAnnonceur) {
        return false;
      }
      if (missionType === "volontariat") {
        return e.name === SERVICE_CIVIQUE;
      }
      if (missionType === "benevolat") {
        return e.name !== SERVICE_CIVIQUE;
      }
      return true;
    }).length,
    broadcasters: publishers.filter((e) => {
      const isDiffuseur = e.hasApiRights || e.hasCampaignRights || e.hasWidgetRights;
      if (!isDiffuseur) {
        return false;
      }
      if (missionType === "volontariat") {
        return e.publishers?.some((p) => p.publisherName === SERVICE_CIVIQUE);
      }
      if (missionType === "benevolat") {
        return e.publishers?.some((p) => p.publisherName !== SERVICE_CIVIQUE);
      }
      return true;
    }).length,
    clicks: stats.totalClick,
    applys: stats.totalApply,
  };

  return { data, total };
}

async function getAdminPublisherViewsStats(params: AdminPublisherViewsParams): Promise<AdminPublisherViewsResult> {
  if (getReadStatsFrom() === "pg") {
    return getAdminPublisherViewsStatsFromPg(params);
  }
  return getAdminPublisherViewsStatsFromEs(params);
}

async function getAdminPublisherViewsStatsFromPg({
  from,
  to,
  broadcasterIds = [],
  announcerIds = [],
  missionType,
  source,
}: AdminPublisherViewsParams): Promise<AdminPublisherViewsResult> {
  const baseConditions = createAdminBaseConditions({
    from,
    to,
    missionType,
    broadcasterIds,
    announcerIds,
    source,
  });
  const whereClause = createWhereClause(baseConditions);

  const totalsRows = await prismaCore.$queryRaw<Array<{ total_clicks: bigint | null; total_applies: bigint | null }>>(
    Prisma.sql`
      SELECT
        SUM(CASE WHEN "type" = 'click' THEN 1 ELSE 0 END)::bigint AS total_clicks,
        SUM(CASE WHEN "type" = 'apply' THEN 1 ELSE 0 END)::bigint AS total_applies
      FROM ${STATS_ADMIN_EVENTS_VIEW}
      ${whereClause}
    `
  );

  const totals = totalsRows[0] ?? { total_clicks: 0n, total_applies: 0n };

  const [clickFrom, clickTo, applyFrom, applyTo] = await Promise.all([
    aggregatePublisherCounts({ baseConditions, publisherField: "from", type: "click" }),
    aggregatePublisherCounts({ baseConditions, publisherField: "to", type: "click" }),
    aggregatePublisherCounts({ baseConditions, publisherField: "from", type: "apply" }),
    aggregatePublisherCounts({ baseConditions, publisherField: "to", type: "apply" }),
  ]);

  return {
    clickFrom,
    clickTo,
    applyFrom,
    applyTo,
    totalClick: Number(totals.total_clicks ?? 0n),
    totalApply: Number(totals.total_applies ?? 0n),
  };
}

async function getAdminPublisherViewsStatsFromEs({
  from,
  to,
  broadcasterIds = [],
  announcerIds = [],
  missionType,
  source,
}: AdminPublisherViewsParams): Promise<AdminPublisherViewsResult> {
  const viewQuery: EsQuery = {
    bool: { must: [], must_not: [{ term: { isBot: true } }], should: [], filter: [] },
  };

  if (from && to) {
    viewQuery.bool.filter.push({ range: { createdAt: { gte: from, lte: to } } });
  } else if (from) {
    viewQuery.bool.filter.push({ range: { createdAt: { gte: from } } });
  } else if (to) {
    viewQuery.bool.filter.push({ range: { createdAt: { lte: to } } });
  }

  if (broadcasterIds.length) {
    viewQuery.bool.filter.push({
      bool: {
        should: broadcasterIds.map((id: string) => ({
          term: { "fromPublisherId.keyword": id },
        })),
      },
    });
  }

  if (announcerIds.length) {
    viewQuery.bool.filter.push({
      bool: {
        should: announcerIds.map((id: string) => ({
          term: { "toPublisherId.keyword": id },
        })),
      },
    });
  }

  if (missionType === "volontariat") {
    viewQuery.bool.filter.push({ term: { "toPublisherName.keyword": SERVICE_CIVIQUE } });
  } else if (missionType === "benevolat") {
    viewQuery.bool.filter.push({ bool: { must_not: { term: { "toPublisherName.keyword": SERVICE_CIVIQUE } } } });
  }

  if (source) {
    viewQuery.bool.filter.push({ term: { "source.keyword": source } });
  }

  const viewAggs = {
    clickFrom: {
      filter: { term: { type: "click" } },
      aggs: { data: { terms: { field: "fromPublisherName.keyword", size: 1000 } } },
    },
    clickTo: {
      filter: { term: { type: "click" } },
      aggs: { data: { terms: { field: "toPublisherName.keyword", size: 1000 } } },
    },
    applyFrom: {
      filter: { term: { type: "apply" } },
      aggs: { data: { terms: { field: "fromPublisherName.keyword", size: 1000 } } },
    },
    applyTo: {
      filter: { term: { type: "apply" } },
      aggs: { data: { terms: { field: "toPublisherName.keyword", size: 1000 } } },
    },
    totalClick: { filter: { term: { type: "click" } } },
    totalApply: { filter: { term: { type: "apply" } } },
  } as const;

  const response = await esClient.search({
    index: STATS_INDEX,
    body: {
      query: viewQuery,
      aggs: viewAggs,
      size: 0,
    },
  });

  if (response.statusCode !== 200) {
    throw response.body.error;
  }

  const aggregations = response.body.aggregations;

  const toRecord = (buckets: Array<{ key: string; doc_count: number }> = []) =>
    buckets.reduce<Record<string, number>>((acc, bucket) => {
      if (!bucket.key) {
        return acc;
      }
      acc[bucket.key] = bucket.doc_count;
      return acc;
    }, {});

  return {
    clickFrom: toRecord(aggregations.clickFrom.data.buckets),
    clickTo: toRecord(aggregations.clickTo.data.buckets),
    applyFrom: toRecord(aggregations.applyFrom.data.buckets),
    applyTo: toRecord(aggregations.applyTo.data.buckets),
    totalClick: aggregations.totalClick.doc_count,
    totalApply: aggregations.totalApply.doc_count,
  };
}

async function aggregatePublisherCounts({
  baseConditions,
  publisherField,
  type,
}: {
  baseConditions: Prisma.Sql[];
  publisherField: "from" | "to";
  type: "click" | "apply";
}): Promise<Record<string, number>> {
  const publisherNameField = Prisma.raw(`"${publisherField}_publisher_name"`);
  const conditions = [
    ...baseConditions,
    Prisma.sql`"type" = ${type}::"StatEventType"`,
    Prisma.sql`${publisherNameField} IS NOT NULL`,
    Prisma.sql`TRIM(${publisherNameField}) <> ''`,
  ];
  const whereClause = createWhereClause(conditions);

  const rows = await prismaCore.$queryRaw<Array<{ publisher_name: string; total: bigint }>>(
    Prisma.sql`
      SELECT ${publisherNameField} AS publisher_name, COUNT(*)::bigint AS total
      FROM ${STATS_ADMIN_EVENTS_VIEW}
      ${whereClause}
      GROUP BY ${publisherNameField}
      ORDER BY total DESC
      LIMIT 1000
    `
  );

  return rows.reduce<Record<string, number>>((acc, row) => {
    if (!row.publisher_name) {
      return acc;
    }
    acc[row.publisher_name] = Number(row.total ?? 0n);
    return acc;
  }, {});
}

function createWhereClause(conditions: Prisma.Sql[]): Prisma.Sql {
  if (!conditions.length) {
    return Prisma.sql``;
  }

  const [first, ...rest] = conditions;
  const combined = rest.reduce<Prisma.Sql>((acc, condition) => Prisma.sql`${acc} AND ${condition}`, first);

  return Prisma.sql`WHERE ${combined}`;
}

function createAdminBaseConditions({
  from,
  to,
  missionType,
  broadcasterIds = [],
  announcerIds = [],
  source,
}: {
  from?: Date;
  to?: Date;
  missionType?: MissionTypeFilter;
  broadcasterIds?: string[];
  announcerIds?: string[];
  source?: PublisherViewsSourceFilter;
}): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [];

  if (from) {
    conditions.push(Prisma.sql`"created_at" >= ${from}`);
  }

  if (to) {
    conditions.push(Prisma.sql`"created_at" <= ${to}`);
  }

  if (missionType) {
    conditions.push(Prisma.sql`"mission_type" = ${missionType}`);
  }

  if (broadcasterIds.length) {
    const values = joinSqlValues(broadcasterIds.map((id) => Prisma.sql`${id}`));
    if (values) {
      conditions.push(Prisma.sql`"from_publisher_id" IN (${values})`);
    }
  }

  if (announcerIds.length) {
    const values = joinSqlValues(announcerIds.map((id) => Prisma.sql`${id}`));
    if (values) {
      conditions.push(Prisma.sql`"to_publisher_id" IN (${values})`);
    }
  }

  if (source) {
    conditions.push(Prisma.sql`"source" = ${source}::"StatSource"`);
  }

  return conditions;
}

function joinSqlValues(values: Prisma.Sql[]): Prisma.Sql | null {
  if (!values.length) {
    return null;
  }

  const [first, ...rest] = values;
  return rest.reduce<Prisma.Sql>((acc, value) => Prisma.sql`${acc}, ${value}`, first);
}

function getReadStatsFrom(): "es" | "pg" {
  return (process.env.READ_STATS_FROM as "es" | "pg") || "es";
}

function buildMonthFacets(from: Date, to: Date) {
  const facets = {} as { [key: string]: any };
  const start = new Date(from);
  const end = new Date(to);

  while (start <= end) {
    const year = start.getFullYear();
    const month = start.getMonth();
    const key = new Date(year, month, 1);
    facets[key.toISOString().replace(".", "_")] = [
      {
        $match: {
          $or: [{ deletedAt: { $gte: new Date(year, month, 1) } }, { deleted: false }],
          createdAt: { $lte: new Date(year, month + 1, 1) },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          volontariat: { $sum: { $cond: [{ $eq: ["$publisherName", SERVICE_CIVIQUE] }, 1, 0] } },
          benevolat: { $sum: { $cond: [{ $ne: ["$publisherName", SERVICE_CIVIQUE] }, 1, 0] } },
        },
      },
    ];
    start.setMonth(start.getMonth() + 1);
  }

  return facets;
}

function buildDaysFacets(from: Date, to: Date) {
  const facets = {} as { [key: string]: any[] };
  const start = new Date(from);
  const end = new Date(to);

  while (start <= end) {
    const year = start.getFullYear();
    const month = start.getMonth();
    const day = start.getDate();
    const key = new Date(year, month, day);
    facets[key.toISOString().replace(".", "_")] = [
      {
        $match: {
          $or: [{ deletedAt: { $gte: new Date(year, month, day) } }, { deleted: false }],
          createdAt: { $lte: new Date(year, month, day + 1) },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          volontariat: { $sum: { $cond: [{ $eq: ["$publisherName", SERVICE_CIVIQUE] }, 1, 0] } },
          benevolat: { $sum: { $cond: [{ $ne: ["$publisherName", SERVICE_CIVIQUE] }, 1, 0] } },
        },
      },
    ];
    start.setDate(start.getDate() + 1);
  }

  return facets;
}
