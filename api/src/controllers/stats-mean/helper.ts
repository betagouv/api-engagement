import { Prisma } from "../../db/core";
import { prismaCore } from "../../db/postgres";

export interface StatsMeanFilters {
  publisherId?: string;
  from?: Date;
  to?: Date;
  source?: string;
}

interface StatsMeanGraph {
  printCount: number;
  clickCount: number;
  applyCount: number;
  accountCount: number;
  rate: number;
}

interface StatsMeanSource {
  id: string;
  name?: string;
  printCount: number;
  clickCount: number;
  applyCount: number;
  accountCount: number;
  rate: number;
}

export interface StatsMeanResult {
  graph: StatsMeanGraph;
  sources: StatsMeanSource[];
}

export async function getStatsMean(filters: StatsMeanFilters): Promise<StatsMeanResult> {
  const whereClauses: Prisma.Sql[] = [Prisma.sql`"is_bot" IS NOT TRUE`];

  if (filters.publisherId) {
    whereClauses.push(Prisma.sql`"from_publisher_id" = ${filters.publisherId}`);
  }

  if (filters.from && filters.to) {
    whereClauses.push(Prisma.sql`"created_at" BETWEEN ${filters.from} AND ${filters.to}`);
  } else if (filters.from) {
    whereClauses.push(Prisma.sql`"created_at" >= ${filters.from}`);
  } else if (filters.to) {
    whereClauses.push(Prisma.sql`"created_at" <= ${filters.to}`);
  }

  const sourceFilters = resolveSourceFilters(filters.source);
  if (sourceFilters.length) {
    const values = sourceFilters.map((source) => Prisma.sql`${source}`);
    whereClauses.push(Prisma.sql`"source"::text IN (${Prisma.join(values)})`);
  }

  const whereClause = joinFilters(whereClauses);

  const graphRows = await prismaCore.$queryRaw<Array<{ type: "click" | "print" | "apply" | "account"; count: bigint }>>(
    Prisma.sql`
      SELECT "type", COUNT(*)::bigint AS count
      FROM "StatEvent"
      WHERE ${whereClause}
      GROUP BY "type"
    `
  );

  const graph = graphRows.reduce<StatsMeanGraph>(
    (acc, row) => {
      const count = Number(row.count ?? 0n);
      switch (row.type) {
        case "print":
          acc.printCount = count;
          break;
        case "click":
          acc.clickCount = count;
          break;
        case "apply":
          acc.applyCount = count;
          break;
        case "account":
          acc.accountCount = count;
          break;
        default:
          break;
      }
      return acc;
    },
    { printCount: 0, clickCount: 0, applyCount: 0, accountCount: 0, rate: 0 }
  );

  graph.rate = graph.clickCount ? graph.applyCount / graph.clickCount : 0;

  const sourceRows = await prismaCore.$queryRaw<
    Array<{
      source_id: string | null;
      source_name: string | null;
      total_count: bigint;
      print_count: bigint;
      click_count: bigint;
      apply_count: bigint;
      account_count: bigint;
    }>
  >(
    Prisma.sql`
      SELECT "source_id",
             MAX("source_name") AS source_name,
             COUNT(*)::bigint AS total_count,
             SUM(CASE WHEN "type" = 'print' THEN 1 ELSE 0 END)::bigint AS print_count,
             SUM(CASE WHEN "type" = 'click' THEN 1 ELSE 0 END)::bigint AS click_count,
             SUM(CASE WHEN "type" = 'apply' THEN 1 ELSE 0 END)::bigint AS apply_count,
             SUM(CASE WHEN "type" = 'account' THEN 1 ELSE 0 END)::bigint AS account_count
      FROM "StatEvent"
      WHERE ${whereClause}
        AND "source_id" IS NOT NULL
        AND "source_id" <> ''
      GROUP BY "source_id"
      ORDER BY total_count DESC
    `
  );

  const sources = sourceRows.map<StatsMeanSource>((row) => {
    const printCount = Number(row.print_count ?? 0n);
    const clickCount = Number(row.click_count ?? 0n);
    const applyCount = Number(row.apply_count ?? 0n);
    const accountCount = Number(row.account_count ?? 0n);
    return {
      id: row.source_id ?? "",
      name: row.source_name ?? undefined,
      printCount,
      clickCount,
      applyCount,
      accountCount,
      rate: clickCount ? applyCount / clickCount : 0,
    };
  });

  return { graph, sources };
}

function resolveSourceFilters(source?: string): string[] {
  if (source === "widget" || source === "campaign") {
    return [source];
  }
  return ["publisher", "jstag"];
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
