import { Prisma } from "../../db/core";
import { STATS_INDEX } from "../../config";
import esClient from "../../db/elastic";
import { prismaCore } from "../../db/postgres";
import { EsQuery } from "../../types";

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
  if (getReadStatsFrom() === "pg") {
    return getStatsMeanFromPg(filters);
  }
  return getStatsMeanFromEs(filters);
}

async function getStatsMeanFromEs(filters: StatsMeanFilters): Promise<StatsMeanResult> {
  const where = { bool: { must: [], must_not: [{ term: { isBot: true } }], should: [], filter: [] } } as EsQuery;

  if (filters.publisherId) {
    where.bool.filter.push({ term: { "fromPublisherId.keyword": filters.publisherId } });
  }

  if (filters.from && filters.to) {
    where.bool.filter.push({ range: { createdAt: { gte: filters.from, lte: filters.to } } });
  } else if (filters.from) {
    where.bool.filter.push({ range: { createdAt: { gte: filters.from } } });
  } else if (filters.to) {
    where.bool.filter.push({ range: { createdAt: { lte: filters.to } } });
  }

  const sourceFilters = resolveSourceFilters(filters.source);
  if (sourceFilters.length === 1) {
    where.bool.filter.push({ term: { "source.keyword": sourceFilters[0] } });
  } else if (sourceFilters.length > 1) {
    where.bool.filter.push({
      bool: {
        minimum_should_match: 1,
        should: sourceFilters.map((value) => ({ term: { "source.keyword": value } })),
      },
    });
  }

  const body = {
    query: where,
    size: 0,
    track_total_hits: true,
    aggs: {
      type: { terms: { field: "type.keyword", size: 10 } },
      sources: {
        terms: { field: "sourceId.keyword", size: 1000 },
        aggs: {
          print: { filter: { term: { "type.keyword": "print" } } },
          apply: { filter: { term: { "type.keyword": "apply" } } },
          account: { filter: { term: { "type.keyword": "account" } } },
          click: { filter: { term: { "type.keyword": "click" } } },
          rate: {
            bucket_script: {
              buckets_path: {
                apply: "apply._count",
                click: "click._count",
              },
              script: "params.click > 0 ? params.apply / params.click : 0",
            },
          },
          name: {
            top_hits: {
              _source: { includes: ["sourceName"] },
              size: 1,
            },
          },
        },
      },
    },
  };

  const response = await esClient.search({ index: STATS_INDEX, body });

  const graphBuckets = response.body.aggregations?.type?.buckets ?? [];
  const graph = {
    printCount: getBucketCount(graphBuckets, "print"),
    clickCount: getBucketCount(graphBuckets, "click"),
    applyCount: getBucketCount(graphBuckets, "apply"),
    accountCount: getBucketCount(graphBuckets, "account"),
    rate: 0,
  };
  graph.rate = graph.clickCount ? graph.applyCount / graph.clickCount : 0;

  const sources = (response.body.aggregations?.sources?.buckets as Array<Record<string, any>> | undefined)
    ?.filter((bucket) => bucket.key)
    .map((bucket) => {
      const printCount = bucket.print?.doc_count ?? 0;
      const clickCount = bucket.click?.doc_count ?? 0;
      const applyCount = bucket.apply?.doc_count ?? 0;
      const accountCount = bucket.account?.doc_count ?? 0;
      const topHit = bucket.name?.hits?.hits?.[0];
      return {
        id: bucket.key as string,
        name: topHit?._source?.sourceName as string | undefined,
        printCount,
        clickCount,
        applyCount,
        accountCount,
        rate: bucket.rate?.value ?? (clickCount ? applyCount / clickCount : 0),
      };
    }) ?? [];

  return { graph, sources };
}

async function getStatsMeanFromPg(filters: StatsMeanFilters): Promise<StatsMeanResult> {
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
    whereClauses.push(Prisma.sql`"source" IN (${Prisma.join(values)})`);
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

function getBucketCount(buckets: Array<{ key: string; doc_count: number }>, key: string): number {
  return buckets.find((bucket) => bucket.key === key)?.doc_count ?? 0;
}

function getReadStatsFrom(): "es" | "pg" {
  return (process.env.READ_STATS_FROM as "es" | "pg") || "es";
}
