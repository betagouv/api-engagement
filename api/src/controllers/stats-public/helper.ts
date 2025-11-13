import { Prisma } from "../../db/core";
import { prismaCore } from "../../db/postgres";

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

/**
 * Note: This function uses the public stats material views
 * See migration: prisma/core/migrations/20251010120000_create_public_stats_materialized_views/migration.sql
 */
export async function getPublicGraphStats(params: GraphStatsParams): Promise<GraphStatsData> {
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

export async function getPublicDomainStats(params: GraphStatsParams): Promise<DomainStatsData[]> {
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

export async function getPublicDepartmentStats(params: Pick<GraphStatsParams, "type" | "year">): Promise<DepartmentStatsBucket[]> {
  const { type, year } = params;
  const publisherCategory = resolvePublisherCategory(type);

  const rows = await prismaCore.$queryRaw<Array<{ departement: string; mission_count: bigint; click_count: bigint; apply_count: bigint }>>(
    Prisma.sql`
      SELECT "departement", "mission_count", "click_count", "apply_count"
      FROM "PublicStatsDepartments"
      WHERE "year" = ${year}
        AND "publisher_category" = ${publisherCategory}
    `
  );

  return rows.map((row) => ({
    key: row.departement,
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
