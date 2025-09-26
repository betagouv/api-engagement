import { Prisma } from "../../db/core";
import esClient from "../../db/elastic";
import { prismaCore } from "../../db/postgres";
import { STATS_INDEX } from "../../config";
import { EsQuery } from "../../types";

type StatEventType = "click" | "apply" | "print" | "account";
type Flux = "to" | "from";

type PublisherIdField = "from_publisher_id" | "to_publisher_id";
type PublisherNameField = "from_publisher_name" | "to_publisher_name";

type BroadcastPreviewParams = {
  publisherId?: string;
  from?: Date;
  to?: Date;
};

type DistributionParams = BroadcastPreviewParams & {
  type?: StatEventType;
};

type EvolutionParams = {
  publisherId?: string;
  from: Date;
  to: Date;
  type?: StatEventType;
  flux: Flux;
};

type PublisherParams = BroadcastPreviewParams & {
  flux: Flux;
};

type AnnounceParams = BroadcastPreviewParams;

type AnnouncePublishersParams = DistributionParams & {
  flux: Flux;
};

type MissionsParams = BroadcastPreviewParams;

interface HistogramBucket {
  key: number;
  key_as_string: string;
  doc_count: number;
  publishers: {
    buckets: { key: string; doc_count: number }[];
  };
}

// Note: stats-global endpoints rely on materialized views refreshed by the update-stats-views job.
// See migration: prisma/core/migrations/20250211090000_create_stats_global_materialized_views/migration.sql
const STATS_GLOBAL_EVENTS_VIEW = Prisma.raw('"StatsGlobalEvents"');
const STATS_GLOBAL_MISSION_VIEW = Prisma.raw('"StatsGlobalMissionActivity"');

const HISTOGRAM_INTERVAL_SQL: Record<string, Prisma.Sql> = {
  hour: Prisma.raw("'hour'"),
  day: Prisma.raw("'day'"),
  month: Prisma.raw("'month'"),
};

function createWhereClause(conditions: Prisma.Sql[]): Prisma.Sql {
  if (!conditions.length) {
    return Prisma.sql``;
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, Prisma.raw(" AND "))}`;
}

function createEventsConditions({
  publisherId,
  publisherField,
  from,
  to,
  type,
  additionalConditions = [],
}: {
  publisherId?: string;
  publisherField?: PublisherIdField;
  from?: Date;
  to?: Date;
  type?: StatEventType;
  additionalConditions?: Prisma.Sql[];
}): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [];

  if (publisherId && publisherField) {
    conditions.push(Prisma.sql`${Prisma.raw(`"${publisherField}"`)} = ${publisherId}`);
  }

  if (from) {
    conditions.push(Prisma.sql`"created_at" >= ${from}`);
  }

  if (to) {
    conditions.push(Prisma.sql`"created_at" <= ${to}`);
  }

  if (type) {
    conditions.push(Prisma.sql`"type" = ${type}::"StatEventType"`);
  }

  if (additionalConditions.length) {
    conditions.push(...additionalConditions);
  }

  return conditions;
}

function createMissionConditions({
  publisherId,
  publisherField,
  from,
  to,
  type,
  additionalConditions = [],
}: {
  publisherId?: string;
  publisherField?: PublisherIdField;
  from?: Date;
  to?: Date;
  type?: StatEventType;
  additionalConditions?: Prisma.Sql[];
}): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [];

  if (publisherId && publisherField) {
    conditions.push(Prisma.sql`${Prisma.raw(`"${publisherField}"`)} = ${publisherId}`);
  }

  if (from) {
    conditions.push(Prisma.sql`"last_created_at" >= ${from}`);
  }

  if (to) {
    conditions.push(Prisma.sql`"first_created_at" <= ${to}`);
  }

  if (type) {
    conditions.push(Prisma.sql`"type" = ${type}::"StatEventType"`);
  }

  if (additionalConditions.length) {
    conditions.push(...additionalConditions);
  }

  return conditions;
}

async function countEvents(whereClause: Prisma.Sql): Promise<number> {
  const rows = await prismaCore.$queryRaw<Array<{ total: bigint }>>(
    Prisma.sql`
      SELECT COUNT(*)::bigint AS total
      FROM ${STATS_GLOBAL_EVENTS_VIEW}
      ${whereClause}
    `
  );

  return Number(rows[0]?.total ?? 0n);
}

async function countMissions(whereClause: Prisma.Sql): Promise<number> {
  const rows = await prismaCore.$queryRaw<Array<{ total: bigint }>>(
    Prisma.sql`
      SELECT COUNT(DISTINCT ${Prisma.raw('"mission_id"')})::bigint AS total
      FROM ${STATS_GLOBAL_MISSION_VIEW}
      ${whereClause}
    `
  );

  return Number(rows[0]?.total ?? 0n);
}

export async function getBroadcastPreviewStats(params: BroadcastPreviewParams) {
  if (getReadStatsFrom() === "pg") {
    return getBroadcastPreviewStatsFromPg(params);
  }
  return getBroadcastPreviewStatsFromEs(params);
}

export async function getAnnouncePreviewStats(params: AnnounceParams) {
  if (getReadStatsFrom() === "pg") {
    return getAnnouncePreviewStatsFromPg(params);
  }
  return getAnnouncePreviewStatsFromEs(params);
}

export async function getDistributionStats(params: DistributionParams) {
  if (getReadStatsFrom() === "pg") {
    return getDistributionStatsFromPg(params);
  }
  return getDistributionStatsFromEs(params);
}

export async function getEvolutionStats(params: EvolutionParams) {
  if (getReadStatsFrom() === "pg") {
    return getEvolutionStatsFromPg(params);
  }
  return getEvolutionStatsFromEs(params);
}

export async function getBroadcastPublishers(params: PublisherParams) {
  if (getReadStatsFrom() === "pg") {
    return getBroadcastPublishersFromPg(params);
  }
  return getBroadcastPublishersFromEs(params);
}

export async function getAnnouncePublishers(params: AnnouncePublishersParams) {
  if (getReadStatsFrom() === "pg") {
    return getAnnouncePublishersFromPg(params);
  }
  return getAnnouncePublishersFromEs(params);
}

export async function getMissionsStats(params: MissionsParams) {
  if (getReadStatsFrom() === "pg") {
    return getMissionsStatsFromPg(params);
  }
  return getMissionsStatsFromEs(params);
}

function getReadStatsFrom(): "es" | "pg" {
  return (process.env.READ_STATS_FROM as "es" | "pg") === "pg" ? "pg" : "es";
}

function createBaseEsQuery(): EsQuery {
  return {
    bool: {
      must: [],
      must_not: [{ term: { isBot: true } }],
      should: [],
      filter: [],
    },
  } as EsQuery;
}

function applyDateFiltersToEsQuery(query: EsQuery, from?: Date, to?: Date) {
  if (from && to) {
    query.bool.filter.push({ range: { createdAt: { gte: from.toISOString(), lte: to.toISOString() } } });
    return;
  }
  if (from) {
    query.bool.filter.push({ range: { createdAt: { gte: from.toISOString() } } });
  }
  if (to) {
    query.bool.filter.push({ range: { createdAt: { lte: to.toISOString() } } });
  }
}

async function getBroadcastPreviewStatsFromEs({ publisherId, from, to }: BroadcastPreviewParams) {
  const where = createBaseEsQuery();

  if (publisherId) {
    where.bool.filter.push({ term: { "fromPublisherId.keyword": publisherId } });
  }

  applyDateFiltersToEsQuery(where, from, to);

  const body = {
    query: where,
    size: 0,
    track_total_hits: true,
    aggs: {
      totalClick: {
        filter: { term: { type: "click" } },
      },
      totalApply: {
        filter: { term: { type: "apply" } },
      },
      totalPrint: {
        filter: { term: { type: "print" } },
      },
      totalAccount: {
        filter: { term: { type: "account" } },
      },
      totalMissionApply: {
        filter: { term: { type: "apply" } },
        aggs: {
          missions: {
            cardinality: {
              field: "missionId.keyword",
            },
          },
        },
      },
      totalMissionClick: {
        filter: { term: { type: "click" } },
        aggs: {
          missions: {
            cardinality: {
              field: "missionId.keyword",
            },
          },
        },
      },
    },
  };

  const response = await esClient.search({ index: STATS_INDEX, body });

  return {
    totalClick: response.body.aggregations.totalClick.doc_count as number,
    totalApply: response.body.aggregations.totalApply.doc_count as number,
    totalPrint: response.body.aggregations.totalPrint.doc_count as number,
    totalAccount: response.body.aggregations.totalAccount.doc_count as number,
    totalMissionApply: response.body.aggregations.totalMissionApply.missions.value as number,
    totalMissionClick: response.body.aggregations.totalMissionClick.missions.value as number,
  };
}

async function getBroadcastPreviewStatsFromPg({ publisherId, from, to }: BroadcastPreviewParams) {
  const eventsWhere = createWhereClause(createEventsConditions({ publisherId, publisherField: "from_publisher_id", from, to }));

  const [totalsRow] = await prismaCore.$queryRaw<Array<{
    total_click: bigint;
    total_apply: bigint;
    total_print: bigint;
    total_account: bigint;
  }>>(
    Prisma.sql`
      SELECT
        SUM(CASE WHEN "type" = 'click' THEN 1 ELSE 0 END)::bigint AS total_click,
        SUM(CASE WHEN "type" = 'apply' THEN 1 ELSE 0 END)::bigint AS total_apply,
        SUM(CASE WHEN "type" = 'print' THEN 1 ELSE 0 END)::bigint AS total_print,
        SUM(CASE WHEN "type" = 'account' THEN 1 ELSE 0 END)::bigint AS total_account
      FROM ${STATS_GLOBAL_EVENTS_VIEW}
      ${eventsWhere}
    `
  );

  const missionWhereBase = createMissionConditions({ publisherId, publisherField: "from_publisher_id", from, to });

  const [totalMissionApply, totalMissionClick] = await Promise.all([
    countMissions(
      createWhereClause([
        ...missionWhereBase,
        Prisma.sql`"type" = 'apply'::"StatEventType"`,
      ])
    ),
    countMissions(
      createWhereClause([
        ...missionWhereBase,
        Prisma.sql`"type" = 'click'::"StatEventType"`,
      ])
    ),
  ]);

  return {
    totalClick: Number(totalsRow?.total_click ?? 0n),
    totalApply: Number(totalsRow?.total_apply ?? 0n),
    totalPrint: Number(totalsRow?.total_print ?? 0n),
    totalAccount: Number(totalsRow?.total_account ?? 0n),
    totalMissionApply,
    totalMissionClick,
  };
}

async function getAnnouncePreviewStatsFromEs({ publisherId, from, to }: AnnounceParams) {
  const where = createBaseEsQuery();

  if (publisherId) {
    where.bool.filter.push({ term: { "toPublisherId.keyword": publisherId } });
  }

  if (from) {
    where.bool.must.push({ range: { createdAt: { gte: from.toISOString() } } });
  }
  if (to) {
    where.bool.must.push({ range: { createdAt: { lte: to.toISOString() } } });
  }

  const body = {
    query: where,
    size: 0,
    track_total_hits: true,
    aggs: {
      totalClick: {
        filter: { term: { type: "click" } },
      },
      totalApply: {
        filter: { term: { type: "apply" } },
      },
      totalPrint: {
        filter: { term: { type: "print" } },
      },
      totalAccount: {
        filter: { term: { type: "account" } },
      },
      totalMissionClicked: {
        filter: { term: { type: "click" } },
        aggs: {
          missions: {
            cardinality: {
              field: "missionId.keyword",
            },
          },
        },
      },
    },
  };

  const response = await esClient.search({ index: STATS_INDEX, body });

  return {
    totalPrint: response.body.aggregations.totalPrint.doc_count as number,
    totalClick: response.body.aggregations.totalClick.doc_count as number,
    totalApply: response.body.aggregations.totalApply.doc_count as number,
    totalAccount: response.body.aggregations.totalAccount.doc_count as number,
    totalMissionClicked: response.body.aggregations.totalMissionClicked.missions.value as number,
  };
}

async function getAnnouncePreviewStatsFromPg({ publisherId, from, to }: AnnounceParams) {
  const eventsWhere = createWhereClause(createEventsConditions({ publisherId, publisherField: "to_publisher_id", from, to }));

  const [totalsRow] = await prismaCore.$queryRaw<Array<{
    total_click: bigint;
    total_apply: bigint;
    total_print: bigint;
    total_account: bigint;
  }>>(
    Prisma.sql`
      SELECT
        SUM(CASE WHEN "type" = 'click' THEN 1 ELSE 0 END)::bigint AS total_click,
        SUM(CASE WHEN "type" = 'apply' THEN 1 ELSE 0 END)::bigint AS total_apply,
        SUM(CASE WHEN "type" = 'print' THEN 1 ELSE 0 END)::bigint AS total_print,
        SUM(CASE WHEN "type" = 'account' THEN 1 ELSE 0 END)::bigint AS total_account
      FROM ${STATS_GLOBAL_EVENTS_VIEW}
      ${eventsWhere}
    `
  );

  const missionWhereBase = createMissionConditions({ publisherId, publisherField: "to_publisher_id", from, to });

  const totalMissionClicked = await countMissions(
    createWhereClause([
      ...missionWhereBase,
      Prisma.sql`"type" = 'click'::"StatEventType"`,
    ])
  );

  return {
    totalPrint: Number(totalsRow?.total_print ?? 0n),
    totalClick: Number(totalsRow?.total_click ?? 0n),
    totalApply: Number(totalsRow?.total_apply ?? 0n),
    totalAccount: Number(totalsRow?.total_account ?? 0n),
    totalMissionClicked,
  };
}

async function getDistributionStatsFromEs({ publisherId, from, to, type }: DistributionParams) {
  const where = createBaseEsQuery();

  if (publisherId) {
    where.bool.filter.push({ term: { "fromPublisherId.keyword": publisherId } });
  }
  applyDateFiltersToEsQuery(where, from, to);
  if (type) {
    where.bool.filter.push({ term: { type } });
  }

  const body = {
    query: where,
    size: 0,
    track_total_hits: true,
    aggs: {
      by_source: {
        terms: {
          field: "source.keyword",
        },
        aggs: {
          total_count: {
            value_count: { field: "_id" },
          },
        },
      },
    },
  };

  const response = await esClient.search({ index: STATS_INDEX, body });

  return (response.body.aggregations.by_source.buckets as { key: string; total_count: { value: number } }[]).map((bucket) => ({
    key: bucket.key,
    doc_count: bucket.total_count.value,
  }));
}

async function getDistributionStatsFromPg({ publisherId, from, to, type }: DistributionParams) {
  const whereClause = createWhereClause(createEventsConditions({ publisherId, publisherField: "from_publisher_id", from, to, type }));

  const rows = await prismaCore.$queryRaw<Array<{ source: string | null; doc_count: bigint }>>(
    Prisma.sql`
      SELECT
        "source",
        COUNT(*)::bigint AS doc_count
      FROM ${STATS_GLOBAL_EVENTS_VIEW}
      ${whereClause}
      GROUP BY "source"
      ORDER BY doc_count DESC
    `
  );

  return rows
    .filter((row) => !!row.source)
    .map((row) => ({ key: row.source as string, doc_count: Number(row.doc_count) }));
}

async function getEvolutionStatsFromEs({ publisherId, from, to, type, flux }: EvolutionParams) {
  const diff = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
  const interval = diff < 1 ? "hour" : diff < 61 ? "day" : "month";

  const where = createBaseEsQuery();

  if (publisherId) {
    where.bool.filter.push({ term: { [`${flux}PublisherId.keyword`]: publisherId } });
  }
  applyDateFiltersToEsQuery(where, from, to);
  if (type) {
    where.bool.filter.push({ term: { type: type.toString() } });
  }

  const body = {
    track_total_hits: true,
    query: where,
    aggs: {
      topPublishers: {
        terms: {
          field: flux === "to" ? "fromPublisherName.keyword" : "toPublisherName.keyword",
          size: 4,
        },
      },
      histogram: {
        date_histogram: {
          field: "createdAt",
          calendar_interval: interval,
          time_zone: "Europe/Paris",
        },
        aggs: {
          publishers: {
            terms: {
              field: flux === "to" ? "fromPublisherName.keyword" : "toPublisherName.keyword",
              size: 80,
            },
          },
        },
      },
    },
    sort: [{ createdAt: { order: "desc" } }],
    size: 0,
  };

  const response = await esClient.search({ index: STATS_INDEX, body });

  return {
    histogram: response.body.aggregations.histogram.buckets as HistogramBucket[],
    topPublishers: (response.body.aggregations.topPublishers.buckets as { key: string }[]).map((bucket) => bucket.key),
    total: response.body.hits.total.value as number,
  };
}

async function getEvolutionStatsFromPg({ publisherId, from, to, type, flux }: EvolutionParams) {
  const diff = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
  const interval = diff < 1 ? "hour" : diff < 61 ? "day" : "month";
  const intervalSql = HISTOGRAM_INTERVAL_SQL[interval];

  const publisherField: PublisherIdField = flux === "to" ? "to_publisher_id" : "from_publisher_id";
  const publisherNameField: PublisherNameField = flux === "to" ? "from_publisher_name" : "to_publisher_name";

  const baseConditions = createEventsConditions({ publisherId, publisherField, from, to, type });
  const total = await countEvents(createWhereClause(baseConditions));

  const additionalConditions = [
    Prisma.sql`${Prisma.raw(`"${publisherNameField}"`)} IS NOT NULL`,
    Prisma.sql`TRIM(${Prisma.raw(`"${publisherNameField}"`)}) <> ''`,
  ];
  const whereSql = createWhereClause([...baseConditions, ...additionalConditions]);

  const histogramRows = await prismaCore.$queryRaw<Array<{ bucket: Date; publisher_name: string | null; doc_count: bigint }>>(
    Prisma.sql`
      SELECT
        date_trunc(${intervalSql}, "created_at" AT TIME ZONE 'Europe/Paris') AS bucket,
        ${Prisma.raw(`"${publisherNameField}"`)} AS publisher_name,
        COUNT(*)::bigint AS doc_count
      FROM ${STATS_GLOBAL_EVENTS_VIEW}
      ${whereSql}
      GROUP BY bucket, ${Prisma.raw(`"${publisherNameField}"`)}
      ORDER BY bucket ASC, doc_count DESC
    `
  );

  const histogramMap = new Map<number, HistogramBucket>();

  histogramRows.forEach((row) => {
    if (!row.bucket) {
      return;
    }
    const date = row.bucket instanceof Date ? row.bucket : new Date(row.bucket as unknown as string);
    const key = date.getTime();
    const entry = histogramMap.get(key);
    const docCount = Number(row.doc_count);
    if (!entry) {
      histogramMap.set(key, {
        key,
        key_as_string: date.toISOString(),
        doc_count: docCount,
        publishers: {
          buckets: row.publisher_name ? [{ key: row.publisher_name, doc_count: docCount }] : [],
        },
      });
      return;
    }

    entry.doc_count += docCount;
    if (row.publisher_name) {
      entry.publishers.buckets.push({ key: row.publisher_name, doc_count: docCount });
    }
  });

  const histogram = Array.from(histogramMap.values())
    .map((bucket) => ({
      ...bucket,
      publishers: {
        buckets: bucket.publishers.buckets
          .sort((a, b) => b.doc_count - a.doc_count)
          .slice(0, 80),
      },
    }))
    .sort((a, b) => a.key - b.key);

  const topPublisherRows = await prismaCore.$queryRaw<Array<{ publisher_name: string | null; doc_count: bigint }>>(
    Prisma.sql`
      SELECT
        ${Prisma.raw(`"${publisherNameField}"`)} AS publisher_name,
        COUNT(*)::bigint AS doc_count
      FROM ${STATS_GLOBAL_EVENTS_VIEW}
      ${whereSql}
      GROUP BY ${Prisma.raw(`"${publisherNameField}"`)}
      ORDER BY doc_count DESC
      LIMIT 4
    `
  );

  const topPublishers = topPublisherRows
    .map((row) => row.publisher_name)
    .filter((name): name is string => !!name && name.trim().length > 0);

  return {
    histogram,
    topPublishers,
    total,
  };
}

async function getBroadcastPublishersFromEs({ publisherId, from, to, flux }: PublisherParams) {
  const where = createBaseEsQuery();

  if (publisherId) {
    where.bool.filter.push({
      term: { [`${flux}PublisherId.keyword`]: publisherId },
    });
  }
  applyDateFiltersToEsQuery(where, from, to);

  const field = flux === "to" ? "fromPublisherName.keyword" : "toPublisherName.keyword";

  const body = {
    query: where,
    aggs: {
      by_announcer: {
        terms: {
          field,
          size: 1000,
        },
        aggs: {
          total_click: {
            filter: { term: { type: "click" } },
            aggs: {
              count: { value_count: { field: "_id" } },
            },
          },
          total_apply: {
            filter: { term: { type: "apply" } },
            aggs: {
              count: { value_count: { field: "_id" } },
            },
          },
          total_account: {
            filter: { term: { type: "account" } },
            aggs: {
              count: { value_count: { field: "_id" } },
            },
          },
          total_print: {
            filter: { term: { type: "print" } },
            aggs: {
              count: { value_count: { field: "_id" } },
            },
          },
        },
      },
    },
    size: 0,
  };

  const response = await esClient.search({ index: STATS_INDEX, body });

  return (response.body.aggregations.by_announcer.buckets as any[]).map((bucket) => ({
    publisherName: bucket.key,
    clickCount: bucket.total_click.count.value as number,
    applyCount: bucket.total_apply.count.value as number,
    accountCount: bucket.total_account.count.value as number,
    printCount: bucket.total_print.count.value as number,
    rate: bucket.total_click.count.value ? bucket.total_apply.count.value / bucket.total_click.count.value : 0,
  }));
}

async function getBroadcastPublishersFromPg({ publisherId, from, to, flux }: PublisherParams) {
  const publisherField: PublisherIdField = flux === "to" ? "to_publisher_id" : "from_publisher_id";
  const publisherNameField: PublisherNameField = flux === "to" ? "from_publisher_name" : "to_publisher_name";

  const baseConditions = createEventsConditions({ publisherId, publisherField, from, to });
  const whereSql = createWhereClause([
    ...baseConditions,
    Prisma.sql`${Prisma.raw(`"${publisherNameField}"`)} IS NOT NULL`,
    Prisma.sql`TRIM(${Prisma.raw(`"${publisherNameField}"`)}) <> ''`,
  ]);

  const rows = await prismaCore.$queryRaw<
    Array<{
      publisher_name: string | null;
      click_count: bigint;
      apply_count: bigint;
      account_count: bigint;
      print_count: bigint;
    }>
  >(
    Prisma.sql`
      SELECT
        ${Prisma.raw(`"${publisherNameField}"`)} AS publisher_name,
        SUM(CASE WHEN "type" = 'click' THEN 1 ELSE 0 END)::bigint AS click_count,
        SUM(CASE WHEN "type" = 'apply' THEN 1 ELSE 0 END)::bigint AS apply_count,
        SUM(CASE WHEN "type" = 'account' THEN 1 ELSE 0 END)::bigint AS account_count,
        SUM(CASE WHEN "type" = 'print' THEN 1 ELSE 0 END)::bigint AS print_count
      FROM ${STATS_GLOBAL_EVENTS_VIEW}
      ${whereSql}
      GROUP BY ${Prisma.raw(`"${publisherNameField}"`)}
      ORDER BY click_count DESC
    `
  );

  return rows.map((row) => {
    const clickCount = Number(row.click_count);
    const applyCount = Number(row.apply_count);
    const accountCount = Number(row.account_count);
    const printCount = Number(row.print_count);
    return {
      publisherName: row.publisher_name ?? "",
      clickCount,
      applyCount,
      accountCount,
      printCount,
      rate: clickCount ? applyCount / clickCount : 0,
    };
  });
}

async function getAnnouncePublishersFromEs({ publisherId, from, to, type, flux }: AnnouncePublishersParams) {
  const where = createBaseEsQuery();

  if (publisherId) {
    where.bool.filter.push({ term: { [`${flux}PublisherId.keyword`]: publisherId } });
  }
  applyDateFiltersToEsQuery(where, from, to);
  if (type) {
    where.bool.filter.push({ term: { type } });
  }

  const field = flux === "to" ? "fromPublisherName.keyword" : "toPublisherName.keyword";

  const body = {
    query: where,
    aggs: {
      announcer: {
        terms: {
          field,
          size: 100,
        },
      },
    },
    size: 0,
  };

  const response = await esClient.search({ index: STATS_INDEX, body });
  const buckets = response.body.aggregations.announcer.buckets as { key: string; doc_count: number }[];

  return {
    data: buckets,
    total: buckets.length,
  };
}

async function getAnnouncePublishersFromPg({ publisherId, from, to, type, flux }: AnnouncePublishersParams) {
  const publisherField: PublisherIdField = flux === "to" ? "to_publisher_id" : "from_publisher_id";
  const publisherNameField: PublisherNameField = flux === "to" ? "from_publisher_name" : "to_publisher_name";

  const baseConditions = createEventsConditions({ publisherId, publisherField, from, to, type });
  const whereSql = createWhereClause([
    ...baseConditions,
    Prisma.sql`${Prisma.raw(`"${publisherNameField}"`)} IS NOT NULL`,
    Prisma.sql`TRIM(${Prisma.raw(`"${publisherNameField}"`)}) <> ''`,
  ]);

  const rows = await prismaCore.$queryRaw<Array<{ publisher_name: string | null; doc_count: bigint }>>(
    Prisma.sql`
      SELECT
        ${Prisma.raw(`"${publisherNameField}"`)} AS publisher_name,
        COUNT(*)::bigint AS doc_count
      FROM ${STATS_GLOBAL_EVENTS_VIEW}
      ${whereSql}
      GROUP BY ${Prisma.raw(`"${publisherNameField}"`)}
      ORDER BY doc_count DESC
      LIMIT 100
    `
  );

  const data = rows
    .map((row) => ({ key: row.publisher_name ?? "", doc_count: Number(row.doc_count) }))
    .filter((row) => row.key.trim().length > 0);

  return {
    data,
    total: data.length,
  };
}

async function getMissionsStatsFromEs({ publisherId, from, to }: MissionsParams) {
  const where = createBaseEsQuery();

  if (publisherId) {
    where.bool.filter.push({ term: { "fromPublisherId.keyword": publisherId } });
  }

  if (from) {
    where.bool.filter.push({ range: { createdAt: { gte: from.toISOString() } } });
  }
  if (to) {
    where.bool.filter.push({ range: { createdAt: { lte: to.toISOString() } } });
  }

  const body = {
    query: where,
    track_total_hits: true,
    aggs: {
      by_announcer: {
        terms: {
          field: "toPublisherName.keyword",
          size: 1000,
        },
        aggs: {
          uniqueMissions: {
            cardinality: { field: "missionId.keyword" },
          },
        },
      },
    },
    size: 0,
  };

  const response = await esClient.search({ index: STATS_INDEX, body });
  const buckets = response.body.aggregations.by_announcer.buckets as { key: string; uniqueMissions: { value: number } }[];

  return {
    data: buckets.map((bucket) => ({ key: bucket.key, doc_count: bucket.uniqueMissions.value })),
    total: response.body.hits.total.value as number,
  };
}

async function getMissionsStatsFromPg({ publisherId, from, to }: MissionsParams) {
  const total = await countEvents(
    createWhereClause(createEventsConditions({ publisherId, publisherField: "from_publisher_id", from, to }))
  );

  const missionWhere = createWhereClause(
    createMissionConditions({
      publisherId,
      publisherField: "from_publisher_id",
      from,
      to,
      additionalConditions: [
        Prisma.sql`${Prisma.raw('"to_publisher_name"')} IS NOT NULL`,
        Prisma.sql`TRIM(${Prisma.raw('"to_publisher_name"')}) <> ''`,
      ],
    })
  );

  const rows = await prismaCore.$queryRaw<Array<{ publisher_name: string | null; mission_count: bigint }>>(
    Prisma.sql`
      SELECT
        ${Prisma.raw('"to_publisher_name"')} AS publisher_name,
        COUNT(DISTINCT ${Prisma.raw('"mission_id"')})::bigint AS mission_count
      FROM ${STATS_GLOBAL_MISSION_VIEW}
      ${missionWhere}
      GROUP BY ${Prisma.raw('"to_publisher_name"')}
      ORDER BY mission_count DESC
    `
  );

  const data = rows
    .map((row) => ({ key: row.publisher_name ?? "", doc_count: Number(row.mission_count) }))
    .filter((row) => row.key.trim().length > 0);

  return {
    data,
    total,
  };
}
