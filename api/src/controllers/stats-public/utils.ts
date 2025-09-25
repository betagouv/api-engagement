import { Prisma } from "../../db/core";
import esClient from "../../db/elastic";
import { prismaCore } from "../../db/postgres";
import { STATS_INDEX } from "../../config";
import { EsQuery } from "../../types";

interface GraphStatsParams {
  department?: string;
  type?: string;
  year: number;
}

interface HistogramBucket {
  key: string;
  doc_count: number;
}

interface GraphStatsData {
  clicks: HistogramBucket[];
  totalClicks: number;
  applies: HistogramBucket[];
  totalApplies: number;
  organizations: HistogramBucket[];
  totalOrganizations: number;
}

export async function getPublicGraphStats(params: GraphStatsParams): Promise<GraphStatsData> {
  if (getReadStatsFrom() === "pg") {
    return getPublicGraphStatsFromPg(params);
  }

  return getPublicGraphStatsFromEs(params);
}

async function getPublicGraphStatsFromEs(params: GraphStatsParams): Promise<GraphStatsData> {
  const viewQuery: EsQuery = { bool: { must_not: [{ term: { isBot: true } }], filter: [] } };

  if (params.department) {
    viewQuery.bool.filter.push({
      term: { "missionDepartmentName.keyword": params.department },
    });
  }

  if (params.type === "volontariat") {
    viewQuery.bool.filter.push({ term: { "toPublisherName.keyword": "Service Civique" } });
  } else if (params.type === "benevolat") {
    viewQuery.bool.filter.push({
      bool: { must_not: { term: { "toPublisherName.keyword": "Service Civique" } } },
    });
  }

  if (params.year) {
    viewQuery.bool.filter.push({
      range: {
        createdAt: {
          gte: new Date(params.year, 0, 1).toISOString(),
          lte: new Date(params.year, 11, 31).toISOString(),
        },
      },
    });
  }

  const viewBody = {
    track_total_hits: true,
    query: viewQuery,
    aggs: {
      months: {
        date_histogram: { field: "createdAt", calendar_interval: "month", format: "yyyy-MM" },
        aggs: {
          click: {
            filter: { term: { "type.keyword": "click" } },
          },
          apply: {
            filter: { term: { "type.keyword": "apply" } },
          },
        },
      },

      organizations: {
        date_histogram: {
          field: "createdAt",
          calendar_interval: "month",
          format: "yyyy-MM",
        },
        aggs: {
          unique_organizations: {
            cardinality: {
              field: "missionOrganizationName.keyword",
            },
          },
        },
      },
      organizations_count: {
        cardinality: {
          field: "missionOrganizationName.keyword",
        },
      },
    },
    size: 0,
  };

  const viewResponse = await esClient.search({ index: STATS_INDEX, body: viewBody });
  if (viewResponse.statusCode !== 200) {
    throw viewResponse.body?.error ?? new Error("Elasticsearch error");
  }

  const monthsBuckets: Array<{
    key_as_string: string;
    click: { doc_count: number };
    apply: { doc_count: number };
  }> = viewResponse.body.aggregations.months.buckets;

  const organizationsBuckets: Array<{
    key_as_string: string;
    unique_organizations: { value: number };
  }> = viewResponse.body.aggregations.organizations.buckets;

  const clicks = monthsBuckets
    .filter((bucket) => bucket.key_as_string.startsWith(params.year.toString()))
    .map((bucket) => ({
      key: bucket.key_as_string,
      doc_count: bucket.click.doc_count,
    }));

  const totalClicks = monthsBuckets.reduce((acc, bucket) => acc + bucket.click.doc_count, 0);

  const applies = monthsBuckets
    .filter((bucket) => bucket.key_as_string.startsWith(params.year.toString()))
    .map((bucket) => ({
      key: bucket.key_as_string,
      doc_count: bucket.apply.doc_count,
    }));

  const totalApplies = monthsBuckets.reduce((acc, bucket) => acc + bucket.apply.doc_count, 0);

  const organizations = organizationsBuckets
    .filter((bucket) => bucket.key_as_string.startsWith(params.year.toString()))
    .map((bucket) => ({
      key: bucket.key_as_string,
      doc_count: bucket.unique_organizations.value,
    }));

  const totalOrganizations = viewResponse.body.aggregations.organizations_count.value;

  return { clicks, totalClicks, applies, totalApplies, organizations, totalOrganizations };
}

async function getPublicGraphStatsFromPg(params: GraphStatsParams): Promise<GraphStatsData> {
  const { department, type, year } = params;
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  const filters: Prisma.Sql[] = [
    Prisma.sql`"is_bot" IS NOT TRUE`,
    Prisma.sql`"created_at" >= ${start}`,
    Prisma.sql`"created_at" < ${end}`,
  ];

  if (department) {
    filters.push(Prisma.sql`"mission_department_name" = ${department}`);
  }

  if (type === "volontariat") {
    filters.push(Prisma.sql`"to_publisher_name" = 'Service Civique'`);
  } else if (type === "benevolat") {
    filters.push(Prisma.sql`"to_publisher_name" IS DISTINCT FROM 'Service Civique'`);
  }

  const whereClause = joinFilters(filters);

  const monthlyEvents = await prismaCore.$queryRaw<
    Array<{ month: number; type: "click" | "apply"; doc_count: bigint }>
  >(
    Prisma.sql`
      SELECT
        EXTRACT(MONTH FROM "created_at")::int AS month,
        "type" AS type,
        COUNT(*)::bigint AS doc_count
      FROM "StatEvent"
      WHERE ${whereClause}
        AND "type" IN ('click', 'apply')
      GROUP BY month, type
    `
  );

  const monthlyOrganizations = await prismaCore.$queryRaw<
    Array<{ month: number; doc_count: bigint }>
  >(
    Prisma.sql`
      SELECT
        EXTRACT(MONTH FROM "created_at")::int AS month,
        COUNT(DISTINCT "mission_organization_name")::bigint AS doc_count
      FROM "StatEvent"
      WHERE ${whereClause}
        AND "mission_organization_name" IS NOT NULL
        AND "mission_organization_name" <> ''
      GROUP BY month
    `
  );

  const totalOrganizationsRow = await prismaCore.$queryRaw<Array<{ doc_count: bigint }>>(
    Prisma.sql`
      SELECT COUNT(DISTINCT "mission_organization_name")::bigint AS doc_count
      FROM "StatEvent"
      WHERE ${whereClause}
        AND "mission_organization_name" IS NOT NULL
        AND "mission_organization_name" <> ''
    `
  );

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const lastMonth = year === currentYear ? currentMonth : 11;

  const clickCounts: Record<number, number> = {};
  const applyCounts: Record<number, number> = {};

  monthlyEvents.forEach((row) => {
    const monthIndex = Number(row.month) - 1;
    if (monthIndex < 0 || monthIndex > lastMonth) {
      return;
    }

    const value = Number(row.doc_count ?? 0n);
    if (row.type === "click") {
      clickCounts[monthIndex] = value;
    } else if (row.type === "apply") {
      applyCounts[monthIndex] = value;
    }
  });

  const organizationCounts: Record<number, number> = {};
  monthlyOrganizations.forEach((row) => {
    const monthIndex = Number(row.month) - 1;
    if (monthIndex < 0 || monthIndex > lastMonth) {
      return;
    }
    organizationCounts[monthIndex] = Number(row.doc_count ?? 0n);
  });

  const clicks: HistogramBucket[] = [];
  const applies: HistogramBucket[] = [];
  const organizations: HistogramBucket[] = [];

  for (let month = 0; month <= lastMonth; month += 1) {
    const key = buildMonthKey(year, month);
    clicks.push({ key, doc_count: clickCounts[month] ?? 0 });
    applies.push({ key, doc_count: applyCounts[month] ?? 0 });
    organizations.push({ key, doc_count: organizationCounts[month] ?? 0 });
  }

  const totalClicks = clicks.reduce((acc, bucket) => acc + bucket.doc_count, 0);
  const totalApplies = applies.reduce((acc, bucket) => acc + bucket.doc_count, 0);
  const totalOrganizations = Number(totalOrganizationsRow[0]?.doc_count ?? 0n);

  return { clicks, totalClicks, applies, totalApplies, organizations, totalOrganizations };
}

function joinFilters(filters: Prisma.Sql[]): Prisma.Sql {
  if (!filters.length) {
    return Prisma.sql`TRUE`;
  }

  let clause = filters[0];
  for (let i = 1; i < filters.length; i += 1) {
    clause = Prisma.sql`${clause} AND ${filters[i]}`;
  }
  return clause;
}

function buildMonthKey(year: number, month: number): string {
  return `${year}-${month < 9 ? "0" : ""}${month + 1}`;
}

function getReadStatsFrom(): "es" | "pg" {
  return (process.env.READ_STATS_FROM as "es" | "pg") || "es";
}
