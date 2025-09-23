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

type StatEventType = "click" | "print" | "apply" | "account";

type Sql = ReturnType<typeof Prisma.sql>;

export async function getReportAggregations(params: ReportAggregationsParams): Promise<ReportAggregations> {
  if (getReadStatsFrom() === "pg") {
    return getReportAggregationsFromPg(params);
  }
  return getReportAggregationsFromEs(params);
}

async function getReportAggregationsFromEs({ publisherId, month, year, flux }: ReportAggregationsParams) {
  const {
    startMonth,
    startLastMonth,
    endMonth,
    endLastMonth,
    startYear,
    endYear,
    startLastYear,
    endLastYear,
    startLastSixMonths,
    endLastSixMonths,
  } = getReportDateRanges(month, year);

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
  const baseWhere: Record<string, any> = {
    is_bot: false,
    [columns.publisherIdField]: publisherId,
  };

  const [
    printMonth,
    printLastMonth,
    clickMonth,
    clickLastMonth,
    applyMonth,
    applyLastMonth,
    accountMonth,
    accountLastMonth,
  ] = await Promise.all([
    countByTypeBetween("print", ranges.startMonth, ranges.endMonth, baseWhere),
    countByTypeBetween("print", ranges.startLastMonth, ranges.endLastMonth, baseWhere),
    countByTypeBetween("click", ranges.startMonth, ranges.endMonth, baseWhere),
    countByTypeBetween("click", ranges.startLastMonth, ranges.endLastMonth, baseWhere),
    countByTypeBetween("apply", ranges.startMonth, ranges.endMonth, baseWhere),
    countByTypeBetween("apply", ranges.startLastMonth, ranges.endLastMonth, baseWhere),
    countByTypeBetween("account", ranges.startMonth, ranges.endMonth, baseWhere),
    countByTypeBetween("account", ranges.startLastMonth, ranges.endLastMonth, baseWhere),
  ]);

  const [
    clickYearBuckets,
    clickLastYearBuckets,
    applyYearBuckets,
    applyLastYearBuckets,
  ] = await Promise.all([
    getMonthlyBuckets("click", ranges.startYear, ranges.endYear, publisherId, columns.publisherIdColumnSql),
    getMonthlyBuckets("click", ranges.startLastYear, ranges.endLastYear, publisherId, columns.publisherIdColumnSql),
    getMonthlyBuckets("apply", ranges.startYear, ranges.endYear, publisherId, columns.publisherIdColumnSql),
    getMonthlyBuckets("apply", ranges.startLastYear, ranges.endLastYear, publisherId, columns.publisherIdColumnSql),
  ]);

  const [topPublishersRaw, topOrganizationsRaw] = await Promise.all([
    getTopPublishers(publisherId, columns, ranges.startMonth, ranges.endMonth),
    getTopOrganizations(publisherId, columns, ranges.startMonth, ranges.endMonth),
  ]);

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

async function countByTypeBetween(type: StatEventType, start: Date, end: Date, baseWhere: Record<string, any>) {
  return prismaCore.statEvent.count({
    where: {
      ...baseWhere,
      type,
      created_at: { gte: start, lt: end },
    },
  });
}

async function getMonthlyBuckets(
  type: StatEventType,
  start: Date,
  end: Date,
  publisherId: string,
  publisherIdColumnSql: Sql,
) {
  const rows = await prismaCore.$queryRaw<{ month: Date; doc_count: bigint }[]>(
    Prisma.sql`
      SELECT date_trunc('month', created_at) AS month,
             COUNT(*)::bigint AS doc_count
      FROM "StatEvent"
      WHERE is_bot = false
        AND ${publisherIdColumnSql} = ${publisherId}
        AND type = ${type}
        AND created_at >= ${start}
        AND created_at < ${end}
      GROUP BY month
      ORDER BY month
    `,
  );

  return buildHistogramBuckets(start, end, rows);
}

async function getTopPublishers(publisherId: string, columns: ReportColumnDefinitions, start: Date, end: Date) {
  const rows = await prismaCore.$queryRaw<{ key: string | null; doc_count: bigint }[]>(
    Prisma.sql`
      SELECT ${columns.publisherNameColumnSql} AS key,
             COUNT(*)::bigint AS doc_count
      FROM "StatEvent"
      WHERE is_bot = false
        AND ${columns.publisherIdColumnSql} = ${publisherId}
        AND type = 'click'
        AND created_at >= ${start}
        AND created_at < ${end}
        AND ${columns.publisherNameColumnSql} IS NOT NULL
        AND ${columns.publisherNameColumnSql} <> ''
      GROUP BY ${columns.publisherNameColumnSql}
      ORDER BY doc_count DESC
      LIMIT 5
    `,
  );

  return rows.map((row) => ({ key: row.key ?? "", doc_count: Number(row.doc_count) }));
}

async function getTopOrganizations(publisherId: string, columns: ReportColumnDefinitions, start: Date, end: Date) {
  const rows = await prismaCore.$queryRaw<{ key: string | null; doc_count: bigint }[]>(
    Prisma.sql`
      SELECT "mission_organization_name" AS key,
             COUNT(*)::bigint AS doc_count
      FROM "StatEvent"
      WHERE is_bot = false
        AND ${columns.publisherIdColumnSql} = ${publisherId}
        AND type = 'click'
        AND created_at >= ${start}
        AND created_at < ${end}
        AND "mission_organization_name" IS NOT NULL
        AND "mission_organization_name" <> ''
      GROUP BY "mission_organization_name"
      ORDER BY doc_count DESC
      LIMIT 5
    `,
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
  const rows = await prismaCore.$queryRaw<{ month: Date; key: string | null; doc_count: bigint }[]>(
    Prisma.sql`
      SELECT date_trunc('month', created_at) AS month,
             mission_organization_name AS key,
             COUNT(*)::bigint AS doc_count
      FROM "StatEvent"
      WHERE is_bot = false
        AND ${columns.publisherIdColumnSql} = ${publisherId}
        AND type = 'click'
        AND created_at >= ${start}
        AND created_at < ${end}
      GROUP BY month, mission_organization_name
    `,
  );

  const series = getMonthSeries(start, end);

  return series.map((date) => {
    const monthRows = rows.filter((row) => isSameMonth(row.month, date));
    const total = monthRows.reduce((sum, row) => sum + Number(row.doc_count), 0);
    const orgBuckets = topOrganizations.map((org) => {
      const match = monthRows.find((row) => row.key === org.key);
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
