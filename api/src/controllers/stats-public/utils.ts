import { STATS_INDEX } from "../../config";
import { Prisma } from "../../db/core";
import esClient from "../../db/elastic";
import { prismaCore } from "../../db/postgres";
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

interface DomainStatsBucket {
  key: string;
  doc_count: number;
  click: number;
  apply: number;
}

interface DomainStatsData {
  year: number;
  domains: DomainStatsBucket[];
}

interface DepartmentStatsBucket {
  key: string;
  mission_count: number;
  click_count: number;
  apply_count: number;
}

export async function getPublicGraphStats(params: GraphStatsParams): Promise<GraphStatsData> {
  if (getReadStatsFrom() === "pg") {
    return getPublicGraphStatsFromPg(params);
  }

  return getPublicGraphStatsFromEs(params);
}

export async function getPublicDomainStats(params: GraphStatsParams): Promise<DomainStatsData[]> {
  if (getReadStatsFrom() === "pg") {
    return getPublicDomainStatsFromPg(params);
  }

  return getPublicDomainStatsFromEs(params);
}

export async function getPublicDepartmentStats(params: Pick<GraphStatsParams, "type" | "year">): Promise<DepartmentStatsBucket[]> {
  if (getReadStatsFrom() === "pg") {
    return getPublicDepartmentStatsFromPg(params);
  }

  return getPublicDepartmentStatsFromEs(params);
}

async function getPublicGraphStatsFromEs(params: GraphStatsParams): Promise<GraphStatsData> {
  const viewQuery: EsQuery = {
    bool: {
      must_not: [{ term: { isBot: true } }],
      filter: [],
      must: [],
      should: [],
    },
  };

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

async function getPublicDomainStatsFromEs(params: GraphStatsParams): Promise<DomainStatsData[]> {
  const filters: EsQuery["bool"]["filter"] = [
    {
      range: {
        createdAt: {
          gte: new Date(params.year, 0, 1).toISOString(),
          lte: new Date(params.year, 11, 31).toISOString(),
        },
      },
    },
  ];

  if (params.department) {
    filters.push({ term: { "missionDepartmentName.keyword": params.department } });
  }

  if (params.type === "volontariat") {
    filters.push({ term: { "toPublisherName.keyword": "Service Civique" } });
  } else if (params.type === "benevolat") {
    filters.push({
      bool: { must_not: { term: { "toPublisherName.keyword": "Service Civique" } } },
    });
  }

  const body = {
    track_total_hits: true,
    query: {
      bool: {
        must_not: [{ term: { isBot: true } }],
        must: filters.length > 0 ? filters : [{ match_all: {} }],
      },
    },
    aggs: {
      per_year: {
        date_histogram: {
          field: "createdAt",
          calendar_interval: "year",
        },
        aggs: {
          domains: {
            terms: { field: "missionDomain.keyword", size: 100 },
            aggs: {
              unique_missions: {
                cardinality: { field: "missionId.keyword" },
              },
              click: {
                filter: { term: { "type.keyword": "click" } },
              },
              apply: {
                filter: { term: { "type.keyword": "apply" } },
              },
            },
          },
        },
      },
    },
    size: 0,
  };

  const response = await esClient.search({ index: STATS_INDEX, body });
  if (response.statusCode !== 200) {
    throw response.body?.error ?? new Error("Elasticsearch error");
  }

  const aggs = response.body.aggregations;

  return aggs.per_year.buckets.map((yearBucket: { key: string; domains: { buckets: any[] } }) => ({
    year: new Date(yearBucket.key).getFullYear(),
    domains: yearBucket.domains.buckets.map((domainBucket) => ({
      key: domainBucket.key,
      doc_count: domainBucket.unique_missions.value,
      click: domainBucket.click.doc_count,
      apply: domainBucket.apply.doc_count,
    })),
  }));
}

async function getPublicDepartmentStatsFromEs(params: Pick<GraphStatsParams, "type" | "year">): Promise<DepartmentStatsBucket[]> {
  const filter: EsQuery["bool"]["filter"] = [
    {
      range: {
        createdAt: {
          gte: new Date(params.year, 0, 1).toISOString(),
          lte: new Date(params.year, 11, 31).toISOString(),
        },
      },
    },
  ];

  if (params.type === "volontariat") {
    filter.push({ term: { "toPublisherName.keyword": "Service Civique" } });
  } else if (params.type === "benevolat") {
    filter.push({
      bool: { must_not: { term: { "toPublisherName.keyword": "Service Civique" } } },
    });
  }

  const aggBody = {
    size: 0,
    query: {
      bool: {
        must_not: [{ term: { isBot: true } }],
        filter,
      },
    },
    aggs: {
      departments: {
        terms: {
          field: "missionPostalCode.keyword",
          size: 120,
        },
        aggs: {
          unique_missions: {
            cardinality: {
              field: "missionId.keyword",
            },
          },
          clicks: {
            filter: { term: { "type.keyword": "click" } },
          },
          applies: {
            filter: { term: { "type.keyword": "apply" } },
          },
        },
      },
    },
  };

  const response = await esClient.search({ index: STATS_INDEX, body: aggBody });
  if (response.statusCode !== 200) {
    throw response.body?.error ?? new Error("Elasticsearch error");
  }

  return response.body.aggregations.departments.buckets.map(
    (bucket: { key: string; unique_missions: { value: number }; clicks: { doc_count: number }; applies: { doc_count: number } }) => ({
      key: bucket.key,
      mission_count: bucket.unique_missions.value,
      click_count: bucket.clicks.doc_count,
      apply_count: bucket.applies.doc_count,
    })
  );
}

/**
 * Note: This function uses the public stats material views
 * See migration: prisma/core/migrations/20251010120000_create_public_stats_materialized_views/migration.sql
 */
async function getPublicGraphStatsFromPg(params: GraphStatsParams): Promise<GraphStatsData> {
  const { department, type, year } = params;
  const publisherCategory = resolvePublisherCategory(type);

  const monthlyFilters: Prisma.Sql[] = [Prisma.sql`"year" = ${year}`, Prisma.sql`"publisher_category" = ${publisherCategory}`];

  if (department) {
    monthlyFilters.push(Prisma.sql`"is_all_department" = FALSE`);
    monthlyFilters.push(Prisma.sql`"department" = ${department}`);
  } else {
    monthlyFilters.push(Prisma.sql`"is_all_department" = TRUE`);
    monthlyFilters.push(Prisma.sql`"department" IS NULL`);
  }

  const monthlyWhere = joinFilters(monthlyFilters);

  const monthlyRows = await prismaCore.$queryRaw<Array<{ month: number; click_count: bigint; apply_count: bigint; organization_count: bigint }>>(
    Prisma.sql`
      SELECT "month", "click_count", "apply_count", "organization_count"
      FROM "PublicStatsGraphMonthly"
      WHERE ${monthlyWhere}
      ORDER BY "month"
    `
  );

  const monthlyMap = new Map<number, { click: number; apply: number; organization: number }>();
  monthlyRows.forEach((row) => {
    const monthIndex = Number(row.month);
    monthlyMap.set(monthIndex, {
      click: Number(row.click_count ?? 0n),
      apply: Number(row.apply_count ?? 0n),
      organization: Number(row.organization_count ?? 0n),
    });
  });

  const totalFilters: Prisma.Sql[] = [Prisma.sql`"year" = ${year}`, Prisma.sql`"publisher_category" = ${publisherCategory}`];

  if (department) {
    totalFilters.push(Prisma.sql`"is_all_department" = FALSE`);
    totalFilters.push(Prisma.sql`"department" = ${department}`);
  } else {
    totalFilters.push(Prisma.sql`"is_all_department" = TRUE`);
    totalFilters.push(Prisma.sql`"department" IS NULL`);
  }

  const totalWhere = joinFilters(totalFilters);

  const totalRow = await prismaCore.$queryRaw<Array<{ organization_count: bigint }>>(
    Prisma.sql`
      SELECT "organization_count"
      FROM "PublicStatsGraphYearlyOrganizations"
      WHERE ${totalWhere}
      LIMIT 1
    `
  );

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const lastMonth = year === currentYear ? currentMonth : 11;

  const clicks: HistogramBucket[] = [];
  const applies: HistogramBucket[] = [];
  const organizations: HistogramBucket[] = [];

  for (let month = 0; month <= lastMonth; month += 1) {
    const row = monthlyMap.get(month + 1);
    const key = buildMonthKey(year, month);
    clicks.push({ key, doc_count: row?.click ?? 0 });
    applies.push({ key, doc_count: row?.apply ?? 0 });
    organizations.push({ key, doc_count: row?.organization ?? 0 });
  }

  const totalClicks = clicks.reduce((acc, bucket) => acc + bucket.doc_count, 0);
  const totalApplies = applies.reduce((acc, bucket) => acc + bucket.doc_count, 0);
  const totalOrganizations = Number(totalRow[0]?.organization_count ?? 0n);

  return { clicks, totalClicks, applies, totalApplies, organizations, totalOrganizations };
}

async function getPublicDomainStatsFromPg(params: GraphStatsParams): Promise<DomainStatsData[]> {
  const { department, type, year } = params;
  const publisherCategory = resolvePublisherCategory(type);

  const filters: Prisma.Sql[] = [Prisma.sql`"year" = ${year}`, Prisma.sql`"publisher_category" = ${publisherCategory}`];

  if (department) {
    filters.push(Prisma.sql`"is_all_department" = FALSE`);
    filters.push(Prisma.sql`"department" = ${department}`);
  } else {
    filters.push(Prisma.sql`"is_all_department" = TRUE`);
    filters.push(Prisma.sql`"department" IS NULL`);
  }

  const whereClause = joinFilters(filters);

  const rows = await prismaCore.$queryRaw<Array<{ domain: string; mission_count: bigint; click_count: bigint; apply_count: bigint }>>(
    Prisma.sql`
      SELECT "domain", "mission_count", "click_count", "apply_count"
      FROM "PublicStatsDomains"
      WHERE ${whereClause}
    `
  );

  if (!rows.length) {
    return [];
  }

  return [
    {
      year,
      domains: rows.map((row) => ({
        key: row.domain,
        doc_count: Number(row.mission_count ?? 0n),
        click: Number(row.click_count ?? 0n),
        apply: Number(row.apply_count ?? 0n),
      })),
    },
  ];
}

async function getPublicDepartmentStatsFromPg(params: Pick<GraphStatsParams, "type" | "year">): Promise<DepartmentStatsBucket[]> {
  const { type, year } = params;
  const publisherCategory = resolvePublisherCategory(type);

  const rows = await prismaCore.$queryRaw<Array<{ postal_code: string; mission_count: bigint; click_count: bigint; apply_count: bigint }>>(
    Prisma.sql`
      SELECT "postal_code", "mission_count", "click_count", "apply_count"
      FROM "PublicStatsDepartments"
      WHERE "year" = ${year}
        AND "publisher_category" = ${publisherCategory}
    `
  );

  return rows.map((row) => ({
    key: row.postal_code,
    mission_count: Number(row.mission_count ?? 0n),
    click_count: Number(row.click_count ?? 0n),
    apply_count: Number(row.apply_count ?? 0n),
  }));
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

function resolvePublisherCategory(type?: string): "volontariat" | "benevolat" | "all" {
  if (type === "volontariat") {
    return "volontariat";
  }

  if (type === "benevolat") {
    return "benevolat";
  }

  return "all";
}

function getReadStatsFrom(): "es" | "pg" {
  return (process.env.READ_STATS_FROM as "es" | "pg") || "es";
}
