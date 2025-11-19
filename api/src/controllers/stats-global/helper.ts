import { Prisma } from "../../db/core";
import { prismaCore } from "../../db/postgres";

type StatEventType = "click" | "apply" | "print" | "account";
type Flux = "to" | "from";

type PublisherIdField = "from_publisher_id" | "to_publisher_id";
type PublisherNameField = "from_publisher_name" | "to_publisher_name";

type BroadcastPreviewParams = {
  publisherId?: string;
  from?: string;
  to?: string;
};

type DistributionParams = BroadcastPreviewParams & {
  type?: StatEventType;
};

type EvolutionParams = {
  publisherId?: string;
  from: string;
  to: string;
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

  return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
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
  from?: string;
  to?: string;
  type?: StatEventType;
  additionalConditions?: Prisma.Sql[];
}): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [];

  if (publisherId && publisherField) {
    conditions.push(Prisma.sql`${Prisma.raw(`"${publisherField}"`)} = ${publisherId}`);
  }

  const createdAtColumn = Prisma.raw('"created_at"');

  if (from) {
    conditions.push(Prisma.sql`DATE(${createdAtColumn} AT TIME ZONE 'Europe/Paris') >= TO_DATE(${from}, 'YYYY-MM-DD')`);
  }

  if (to) {
    conditions.push(Prisma.sql`DATE(${createdAtColumn} AT TIME ZONE 'Europe/Paris') <= TO_DATE(${to}, 'YYYY-MM-DD')`);
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
  from?: string;
  to?: string;
  type?: StatEventType;
  additionalConditions?: Prisma.Sql[];
}): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [];

  if (publisherId && publisherField) {
    conditions.push(Prisma.sql`${Prisma.raw(`"${publisherField}"`)} = ${publisherId}`);
  }

  const lastCreatedAt = Prisma.raw('"last_created_at"');
  const firstCreatedAt = Prisma.raw('"first_created_at"');

  if (from) {
    conditions.push(Prisma.sql`DATE(${lastCreatedAt} AT TIME ZONE 'Europe/Paris') >= TO_DATE(${from}, 'YYYY-MM-DD')`);
  }

  if (to) {
    conditions.push(Prisma.sql`DATE(${firstCreatedAt} AT TIME ZONE 'Europe/Paris') <= TO_DATE(${to}, 'YYYY-MM-DD')`);
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

export async function getBroadcastPreviewStats({ publisherId, from, to }: BroadcastPreviewParams) {
  const eventsWhere = createWhereClause(createEventsConditions({ publisherId, publisherField: "from_publisher_id", from, to }));

  const [totalsRow] = await prismaCore.$queryRaw<
    Array<{
      total_click: bigint;
      total_apply: bigint;
      total_print: bigint;
      total_account: bigint;
    }>
  >(
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
    countMissions(createWhereClause([...missionWhereBase, Prisma.sql`"type" = 'apply'::"StatEventType"`])),
    countMissions(createWhereClause([...missionWhereBase, Prisma.sql`"type" = 'click'::"StatEventType"`])),
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

export async function getAnnouncePreviewStats({ publisherId, from, to }: AnnounceParams) {
  const eventsWhere = createWhereClause(createEventsConditions({ publisherId, publisherField: "to_publisher_id", from, to }));

  const [totalsRow] = await prismaCore.$queryRaw<
    Array<{
      total_click: bigint;
      total_apply: bigint;
      total_print: bigint;
      total_account: bigint;
    }>
  >(
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

  const totalMissionClicked = await countMissions(createWhereClause([...missionWhereBase, Prisma.sql`"type" = 'click'::"StatEventType"`]));

  return {
    totalPrint: Number(totalsRow?.total_print ?? 0n),
    totalClick: Number(totalsRow?.total_click ?? 0n),
    totalApply: Number(totalsRow?.total_apply ?? 0n),
    totalAccount: Number(totalsRow?.total_account ?? 0n),
    totalMissionClicked,
  };
}

export async function getDistributionStats({ publisherId, from, to, type }: DistributionParams) {
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

  return rows.filter((row) => !!row.source).map((row) => ({ key: row.source as string, doc_count: Number(row.doc_count) }));
}

const parseDateString = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

export async function getEvolutionStats({ publisherId, from, to, type, flux }: EvolutionParams) {
  const fromDate = parseDateString(from);
  const toDate = parseDateString(to);
  const diff = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
  const interval = diff < 1 ? "hour" : diff < 61 ? "day" : "month";
  const intervalSql = HISTOGRAM_INTERVAL_SQL[interval];

  const publisherField: PublisherIdField = flux === "to" ? "to_publisher_id" : "from_publisher_id";
  const publisherNameField: PublisherNameField = flux === "to" ? "from_publisher_name" : "to_publisher_name";

  const baseConditions = createEventsConditions({ publisherId, publisherField, from, to, type });
  const total = await countEvents(createWhereClause(baseConditions));

  const additionalConditions = [Prisma.sql`${Prisma.raw(`"${publisherNameField}"`)} IS NOT NULL`, Prisma.sql`TRIM(${Prisma.raw(`"${publisherNameField}"`)}) <> ''`];
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
        buckets: bucket.publishers.buckets.sort((a, b) => b.doc_count - a.doc_count).slice(0, 80),
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

  const topPublishers = topPublisherRows.map((row) => row.publisher_name).filter((name): name is string => !!name && name.trim().length > 0);

  return {
    histogram,
    topPublishers,
    total,
  };
}

export async function getBroadcastPublishers({ publisherId, from, to, flux }: PublisherParams) {
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

export async function getAnnouncePublishers({ publisherId, from, to, type, flux }: AnnouncePublishersParams) {
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

  const data = rows.map((row) => ({ key: row.publisher_name ?? "", doc_count: Number(row.doc_count) })).filter((row) => row.key.trim().length > 0);

  return {
    data,
    total: data.length,
  };
}

export async function getMissionsStats({ publisherId, from, to }: MissionsParams) {
  const total = await countEvents(createWhereClause(createEventsConditions({ publisherId, publisherField: "from_publisher_id", from, to })));

  const missionWhere = createWhereClause(
    createMissionConditions({
      publisherId,
      publisherField: "from_publisher_id",
      from,
      to,
      additionalConditions: [Prisma.sql`${Prisma.raw('"to_publisher_name"')} IS NOT NULL`, Prisma.sql`TRIM(${Prisma.raw('"to_publisher_name"')}) <> ''`],
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

  const data = rows.map((row) => ({ key: row.publisher_name ?? "", doc_count: Number(row.mission_count) })).filter((row) => row.key.trim().length > 0);

  return {
    data,
    total,
  };
}
