import { Prisma } from "@prisma/client";

import { STATS_INDEX } from "../../../config";
import esClient from "../../../db/elastic";
import { prismaCore } from "../../../db/postgres";

export type ReportFlux = "from" | "to";

export interface TermsBucket {
  key: string;
  doc_count: number;
}

export interface HistogramBucket {
  key: number;
  doc_count: number;
  orga?: { buckets: TermsBucket[] };
}

export interface ReportAggregations {
  print: {
    month: { doc_count: number };
    lastMonth: { doc_count: number };
  };
  click: {
    month: { doc_count: number; topPublishers: { buckets: TermsBucket[] }; topOrganizations: { buckets: TermsBucket[] } };
    lastMonth: { doc_count: number };
    year: { doc_count: number; histogram: { buckets: HistogramBucket[] } };
    lastYear: { doc_count: number; histogram: { buckets: HistogramBucket[] } };
    lastSixMonths: { histogram: { buckets: HistogramBucket[] } };
  };
  apply: {
    month: { doc_count: number };
    lastMonth: { doc_count: number };
    year: { doc_count: number; histogram: { buckets: HistogramBucket[] } };
    lastYear: { doc_count: number; histogram: { buckets: HistogramBucket[] } };
  };
  acccount: {
    month: { doc_count: number };
    lastMonth: { doc_count: number };
  };
}

interface ReportAggregationsParams {
  publisherId: string;
  month: number;
  year: number;
  flux: ReportFlux;
}

type Sql = ReturnType<typeof Prisma.sql>;

export async function getReportAggregations(params: ReportAggregationsParams): Promise<ReportAggregations> {
  if (getReadStatsFrom() === "pg") {
    return getReportAggregationsFromPg(params);
  }
  return getReportAggregationsFromEs(params);
}

async function getReportAggregationsFromEs({ publisherId, month, year, flux }: ReportAggregationsParams) {
  const { startMonth, startLastMonth, endMonth, endLastMonth, startYear, endYear, startLastYear, endLastYear, startLastSixMonths, endLastSixMonths } = getReportDateRanges(
    month,
    year
  );

  const publisherName = flux === "to" ? "fromPublisherName.keyword" : "toPublisherName.keyword";
  const publisherIdField = flux === "to" ? "toPublisherId.keyword" : "fromPublisherId.keyword";

  const response = await esClient.search({
    index: STATS_INDEX,
    body: {
      query: {
        bool: {
          must_not: { term: { isBot: true } },
          filter: { term: { [publisherIdField]: publisherId } },
        },
      },
      aggs: {
        print: {
          filter: { term: { "type.keyword": "print" } },
          aggs: {
            month: {
              filter: { range: { createdAt: { gte: startMonth, lte: endMonth } } },
              aggs: { top: { terms: { field: publisherName, size: 3 } } },
            },
            lastMonth: {
              filter: { range: { createdAt: { gte: startLastMonth, lte: endLastMonth } } },
            },
          },
        },
        click: {
          filter: { term: { "type.keyword": "click" } },
          aggs: {
            month: {
              filter: { range: { createdAt: { gte: startMonth, lte: endMonth } } },
              aggs: {
                topPublishers: { terms: { field: publisherName, size: 5 } },
                topOrganizations: { terms: { field: "missionOrganizationName.keyword", size: 5 } },
              },
            },
            lastMonth: {
              filter: { range: { createdAt: { gte: startLastMonth, lte: endLastMonth } } },
            },
            year: {
              filter: { range: { createdAt: { gte: startYear, lte: endYear } } },
              aggs: {
                histogram: {
                  date_histogram: {
                    field: "createdAt",
                    interval: "month",
                    min_doc_count: 0,
                    time_zone: "Europe/Paris",
                  },
                },
              },
            },
            lastYear: {
              filter: { range: { createdAt: { gte: startLastYear, lte: endLastYear } } },
              aggs: {
                histogram: {
                  date_histogram: {
                    field: "createdAt",
                    interval: "month",
                    min_doc_count: 0,
                    time_zone: "Europe/Paris",
                  },
                },
              },
            },
            lastSixMonths: {
              filter: { range: { createdAt: { gte: startLastSixMonths, lte: endLastSixMonths } } },
              aggs: {
                histogram: {
                  date_histogram: {
                    field: "createdAt",
                    interval: "month",
                    time_zone: "Europe/Paris",
                  },
                  aggs: {
                    orga: { terms: { field: "missionOrganizationName.keyword", size: 100 } },
                  },
                },
              },
            },
          },
        },
        apply: {
          filter: { term: { "type.keyword": "apply" } },
          aggs: {
            month: {
              filter: { range: { createdAt: { gte: startMonth, lte: endMonth } } },
              aggs: { top: { terms: { field: publisherName, size: 3 } } },
            },
            lastMonth: {
              filter: { range: { createdAt: { gte: startLastMonth, lte: endLastMonth } } },
            },
            year: {
              filter: { range: { createdAt: { gte: startYear, lte: endYear } } },
              aggs: {
                histogram: {
                  date_histogram: {
                    field: "createdAt",
                    interval: "month",
                    min_doc_count: 0,
                    time_zone: "Europe/Paris",
                  },
                },
              },
            },
            lastYear: {
              filter: { range: { createdAt: { gte: startLastYear, lte: endLastYear } } },
              aggs: {
                histogram: {
                  date_histogram: {
                    field: "createdAt",
                    interval: "month",
                    time_zone: "Europe/Paris",
                  },
                },
              },
            },
          },
        },
        acccount: {
          filter: { term: { "type.keyword": "account" } },
          aggs: {
            month: {
              filter: { range: { createdAt: { gte: startMonth, lte: endMonth } } },
            },
            lastMonth: {
              filter: { range: { createdAt: { gte: startLastMonth, lte: endLastMonth } } },
            },
          },
        },
      },
      size: 0,
    },
  });

  return response.body.aggregations as ReportAggregations;
}

async function getReportAggregationsFromPg({ publisherId, month, year, flux }: ReportAggregationsParams) {
  const ranges = getReportDateRanges(month, year);
  const columns = getReportColumnDefinitions(flux);

  const counts = await getCounts(publisherId, columns, {
    startMonth: ranges.startMonth,
    endMonth: ranges.endMonth,
    startLastMonth: ranges.startLastMonth,
    endLastMonth: ranges.endLastMonth,
  });

  const printMonth = counts.print_month;
  const printLastMonth = counts.print_last_month;
  const clickMonth = counts.click_month;
  const clickLastMonth = counts.click_last_month;
  const applyMonth = counts.apply_month;
  const applyLastMonth = counts.apply_last_month;
  const accountMonth = counts.account_month;
  const accountLastMonth = counts.account_last_month;

  const { clickYearBuckets, clickLastYearBuckets, applyYearBuckets, applyLastYearBuckets } = await getMonthlyBuckets(publisherId, columns, {
    startYear: ranges.startYear,
    endYear: ranges.endYear,
    startLastYear: ranges.startLastYear,
    endLastYear: ranges.endLastYear,
  });

  const topPublishersRaw = await getTopPublishers(publisherId, columns, ranges.startMonth, ranges.endMonth);
  const topOrganizationsRaw = await getTopOrganizations(publisherId, columns, ranges.startMonth, ranges.endMonth);

  const topPublishers = topPublishersRaw.filter((bucket) => bucket.key);
  const topOrganizations = topOrganizationsRaw.filter((bucket) => bucket.key);

  const lastSixMonthsBuckets = await getLastSixMonthsBuckets({
    publisherId,
    columns,
    start: ranges.startLastSixMonths,
    end: ranges.endLastSixMonths,
    topOrganizations,
  });

  return {
    print: {
      month: { doc_count: printMonth },
      lastMonth: { doc_count: printLastMonth },
    },
    click: {
      month: {
        doc_count: clickMonth,
        topPublishers: { buckets: topPublishers },
        topOrganizations: { buckets: topOrganizations },
      },
      lastMonth: { doc_count: clickLastMonth },
      year: { doc_count: sumDocCounts(clickYearBuckets), histogram: { buckets: clickYearBuckets } },
      lastYear: { doc_count: sumDocCounts(clickLastYearBuckets), histogram: { buckets: clickLastYearBuckets } },
      lastSixMonths: { histogram: { buckets: lastSixMonthsBuckets } },
    },
    apply: {
      month: { doc_count: applyMonth },
      lastMonth: { doc_count: applyLastMonth },
      year: { doc_count: sumDocCounts(applyYearBuckets), histogram: { buckets: applyYearBuckets } },
      lastYear: { doc_count: sumDocCounts(applyLastYearBuckets), histogram: { buckets: applyLastYearBuckets } },
    },
    acccount: {
      month: { doc_count: accountMonth },
      lastMonth: { doc_count: accountLastMonth },
    },
  };
}

async function getCounts(
  publisherId: string,
  columns: ReportColumnDefinitions,
  { startMonth, endMonth, startLastMonth, endLastMonth }: { startMonth: Date; endMonth: Date; startLastMonth: Date; endLastMonth: Date }
) {
  const rows = await prismaCore.$queryRaw<
    Array<{
      print_month: bigint;
      print_last_month: bigint;
      click_month: bigint;
      click_last_month: bigint;
      apply_month: bigint;
      apply_last_month: bigint;
      account_month: bigint;
      account_last_month: bigint;
    }>
  >(
    Prisma.sql`
      WITH bounds AS (
        SELECT ${startMonth}::timestamptz AS sm,
               ${endMonth}::timestamptz AS em,
               ${startLastMonth}::timestamptz AS slm,
               ${endLastMonth}::timestamptz AS elm
      )
      SELECT
        SUM(CASE WHEN type = 'print'  AND created_at >= b.sm  AND created_at < b.em  THEN 1 ELSE 0 END)::bigint AS print_month,
        SUM(CASE WHEN type = 'print'  AND created_at >= b.slm AND created_at < b.elm THEN 1 ELSE 0 END)::bigint AS print_last_month,
        SUM(CASE WHEN type = 'click'  AND created_at >= b.sm  AND created_at < b.em  THEN 1 ELSE 0 END)::bigint AS click_month,
        SUM(CASE WHEN type = 'click'  AND created_at >= b.slm AND created_at < b.elm THEN 1 ELSE 0 END)::bigint AS click_last_month,
        SUM(CASE WHEN type = 'apply'  AND created_at >= b.sm  AND created_at < b.em  THEN 1 ELSE 0 END)::bigint AS apply_month,
        SUM(CASE WHEN type = 'apply'  AND created_at >= b.slm AND created_at < b.elm THEN 1 ELSE 0 END)::bigint AS apply_last_month,
        SUM(CASE WHEN type = 'account' AND created_at >= b.sm  AND created_at < b.em  THEN 1 ELSE 0 END)::bigint AS account_month,
        SUM(CASE WHEN type = 'account' AND created_at >= b.slm AND created_at < b.elm THEN 1 ELSE 0 END)::bigint AS account_last_month
      FROM "StatEvent" s
      CROSS JOIN bounds b
      WHERE s.is_bot IS NOT TRUE
        AND ${columns.publisherIdColumnSql} = ${publisherId}
        AND s.type IN ('print','click','apply','account')
        AND s.created_at >= b.slm
        AND s.created_at < b.em
    `
  );

  const r = rows[0];
  return {
    print_month: Number(r?.print_month ?? 0n),
    print_last_month: Number(r?.print_last_month ?? 0n),
    click_month: Number(r?.click_month ?? 0n),
    click_last_month: Number(r?.click_last_month ?? 0n),
    apply_month: Number(r?.apply_month ?? 0n),
    apply_last_month: Number(r?.apply_last_month ?? 0n),
    account_month: Number(r?.account_month ?? 0n),
    account_last_month: Number(r?.account_last_month ?? 0n),
  };
}

async function getMonthlyBuckets(
  publisherId: string,
  columns: ReportColumnDefinitions,
  { startYear, endYear, startLastYear, endLastYear }: { startYear: Date; endYear: Date; startLastYear: Date; endLastYear: Date }
) {
  const rows = await prismaCore.$queryRaw<Array<{ period: "year" | "lastYear"; type: "click" | "apply"; month: Date; doc_count: bigint }>>(
    Prisma.sql`
      WITH bounds AS (
        SELECT ${startLastYear}::timestamptz AS sly,
               ${endLastYear}::timestamptz   AS ely,
               ${startYear}::timestamptz     AS sy,
               ${endYear}::timestamptz       AS ey
      ), base AS (
        SELECT
          CASE WHEN s.created_at >= b.sy  AND s.created_at < b.ey  THEN 'year'
               WHEN s.created_at >= b.sly AND s.created_at < b.ely THEN 'lastYear'
          END AS period,
          s.type,
          date_trunc('month', s.created_at) AS month,
          COUNT(*)::bigint AS doc_count
        FROM "StatEvent" s
        CROSS JOIN bounds b
        WHERE s.is_bot IS NOT TRUE
          AND ${columns.publisherIdColumnSql} = ${publisherId}
          AND s.type IN ('click','apply')
          AND s.created_at >= b.sly AND s.created_at < b.ey
        GROUP BY period, s.type, month
      )
      SELECT period, type, month, doc_count
      FROM base
      ORDER BY month
    `
  );

  const clickYear = rows.filter((r) => r.type === "click" && r.period === "year").map((r) => ({ month: r.month, doc_count: r.doc_count }));
  const clickLastYear = rows.filter((r) => r.type === "click" && r.period === "lastYear").map((r) => ({ month: r.month, doc_count: r.doc_count }));
  const applyYear = rows.filter((r) => r.type === "apply" && r.period === "year").map((r) => ({ month: r.month, doc_count: r.doc_count }));
  const applyLastYear = rows.filter((r) => r.type === "apply" && r.period === "lastYear").map((r) => ({ month: r.month, doc_count: r.doc_count }));

  const clickYearBuckets = buildHistogramBuckets(startYear, endYear, clickYear as any);
  const clickLastYearBuckets = buildHistogramBuckets(startLastYear, endLastYear, clickLastYear as any);
  const applyYearBuckets = buildHistogramBuckets(startYear, endYear, applyYear as any);
  const applyLastYearBuckets = buildHistogramBuckets(startLastYear, endLastYear, applyLastYear as any);

  return { clickYearBuckets, clickLastYearBuckets, applyYearBuckets, applyLastYearBuckets };
}

async function getTopPublishers(publisherId: string, columns: ReportColumnDefinitions, start: Date, end: Date) {
  const rows = await prismaCore.$queryRaw<{ key: string | null; doc_count: bigint }[]>(
    Prisma.sql`
      SELECT ${columns.publisherNameColumnSql} AS key,
             COUNT(*)::bigint AS doc_count
      FROM "StatEvent"
      WHERE is_bot is NOT true
        AND ${columns.publisherIdColumnSql} = ${publisherId}
        AND type = 'click'
        AND created_at >= ${start}
        AND created_at < ${end}
        AND ${columns.publisherNameColumnSql} IS NOT NULL
        AND ${columns.publisherNameColumnSql} <> ''
      GROUP BY ${columns.publisherNameColumnSql}
      ORDER BY doc_count DESC
      LIMIT 5
    `
  );

  return rows.map((row) => ({ key: row.key ?? "", doc_count: Number(row.doc_count) }));
}

async function getTopOrganizations(publisherId: string, columns: ReportColumnDefinitions, start: Date, end: Date) {
  const rows = await prismaCore.$queryRaw<{ key: string | null; doc_count: bigint }[]>(
    Prisma.sql`
      SELECT "mission_organization_name" AS key,
             COUNT(*)::bigint AS doc_count
      FROM "StatEvent"
      WHERE is_bot is NOT true
        AND ${columns.publisherIdColumnSql} = ${publisherId}
        AND type = 'click'
        AND created_at >= ${start}
        AND created_at < ${end}
        AND "mission_organization_name" IS NOT NULL
        AND "mission_organization_name" <> ''
      GROUP BY "mission_organization_name"
      ORDER BY doc_count DESC
      LIMIT 5
    `
  );

  return rows.map((row) => ({ key: row.key ?? "", doc_count: Number(row.doc_count) }));
}

async function getLastSixMonthsBuckets({
  publisherId,
  columns,
  start,
  end,
  topOrganizations,
}: {
  publisherId: string;
  columns: ReportColumnDefinitions;
  start: Date;
  end: Date;
  topOrganizations: TermsBucket[];
}) {
  // Totals per month
  const totals = await prismaCore.$queryRaw<{ month: Date; doc_count: bigint }[]>(
    Prisma.sql`
      SELECT date_trunc('month', created_at) AS month,
             COUNT(*)::bigint AS doc_count
      FROM "StatEvent"
      WHERE is_bot IS NOT TRUE
        AND ${columns.publisherIdColumnSql} = ${publisherId}
        AND type = 'click'
        AND created_at >= ${start}
        AND created_at < ${end}
      GROUP BY month
      ORDER BY month
    `
  );

  // Per-top-org per month only
  const topKeys = topOrganizations.map((o) => o.key).filter((k) => !!k);
  const perOrg = topKeys.length
    ? await prismaCore.$queryRaw<{ month: Date; key: string | null; doc_count: bigint }[]>(
        Prisma.sql`
          SELECT date_trunc('month', created_at) AS month,
                 mission_organization_name AS key,
                 COUNT(*)::bigint AS doc_count
          FROM "StatEvent"
          WHERE is_bot IS NOT TRUE
            AND ${columns.publisherIdColumnSql} = ${publisherId}
            AND type = 'click'
            AND created_at >= ${start}
            AND created_at < ${end}
            AND mission_organization_name = ANY(${Prisma.sql`ARRAY[${Prisma.join(topKeys)}]`})
          GROUP BY month, mission_organization_name
          ORDER BY month
        `
      )
    : [];

  const series = getMonthSeries(start, end);
  return series.map((date) => {
    const totalRow = totals.find((r) => isSameMonth(r.month, date));
    const total = totalRow ? Number(totalRow.doc_count) : 0;
    const orgBuckets = topOrganizations.map((org) => {
      const match = perOrg.find((row) => row.key === org.key && isSameMonth(row.month, date));
      return { key: org.key, doc_count: match ? Number(match.doc_count) : 0 };
    });
    return {
      key: date.getTime(),
      doc_count: total,
      orga: { buckets: orgBuckets },
    } as HistogramBucket;
  });
}

function buildHistogramBuckets(start: Date, end: Date, rows: { month: Date; doc_count: bigint }[]): HistogramBucket[] {
  const series = getMonthSeries(start, end);
  return series.map((date) => {
    const row = rows.find((r) => isSameMonth(r.month, date));
    return {
      key: date.getTime(),
      doc_count: row ? Number(row.doc_count) : 0,
    };
  });
}

function sumDocCounts(buckets: HistogramBucket[]) {
  return buckets.reduce((sum, bucket) => sum + bucket.doc_count, 0);
}

function getMonthSeries(start: Date, end: Date) {
  const months: Date[] = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  while (current < end) {
    months.push(new Date(current.getTime()));
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

function isSameMonth(a: Date, b: Date) {
  const dateA = new Date(a);
  const dateB = new Date(b);
  return dateA.getFullYear() === dateB.getFullYear() && dateA.getMonth() === dateB.getMonth();
}

interface ReportColumnDefinitions {
  publisherIdField: "from_publisher_id" | "to_publisher_id";
  publisherNameField: "from_publisher_name" | "to_publisher_name";
  publisherIdColumnSql: Sql;
  publisherNameColumnSql: Sql;
}

function getReportColumnDefinitions(flux: ReportFlux): ReportColumnDefinitions {
  if (flux === "to") {
    return {
      publisherIdField: "to_publisher_id",
      publisherNameField: "from_publisher_name",
      publisherIdColumnSql: Prisma.sql`"to_publisher_id"`,
      publisherNameColumnSql: Prisma.sql`"from_publisher_name"`,
    };
  }
  return {
    publisherIdField: "from_publisher_id",
    publisherNameField: "to_publisher_name",
    publisherIdColumnSql: Prisma.sql`"from_publisher_id"`,
    publisherNameColumnSql: Prisma.sql`"to_publisher_name"`,
  };
}

function getReportDateRanges(month: number, year: number) {
  const startMonth = new Date(year, month, 1);
  const startLastMonth = new Date(year, month - 1, 1);
  const endMonth = new Date(year, month + 1, 1);
  const endLastMonth = new Date(year, month, 1);
  const startLastSixMonths = new Date(year, month - 5, 1);
  const endLastSixMonths = new Date(year, month + 1, 1);
  const startYear = new Date(year - 1, month + 1, 1);
  const endYear = new Date(year, month + 1, 1);
  const startLastYear = new Date(year - 2, month + 1, 1);
  const endLastYear = new Date(year - 1, month + 1, 1);

  return {
    startMonth,
    startLastMonth,
    endMonth,
    endLastMonth,
    startLastSixMonths,
    endLastSixMonths,
    startYear,
    endYear,
    startLastYear,
    endLastYear,
  };
}

function getReadStatsFrom(): "es" | "pg" {
  return (process.env.READ_STATS_FROM as "es" | "pg") || "es";
}
