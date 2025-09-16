import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);

const envArgIndex = args.indexOf("--env");
if (envArgIndex !== -1 && args[envArgIndex + 1]) {
  dotenv.config({ path: args[envArgIndex + 1] });
} else {
  dotenv.config();
}

const esArgIndex = args.indexOf("--es");
if (esArgIndex !== -1 && args[esArgIndex + 1]) {
  process.env.ES_ENDPOINT = args[esArgIndex + 1];
}

const dbArgIndex = args.indexOf("--db");
if (dbArgIndex !== -1 && args[dbArgIndex + 1]) {
  process.env.DATABASE_URL_CORE = args[dbArgIndex + 1];
}

const esClient = require("../db/elastic").default;
const { prismaCore } = require("../db/postgres");
const { STATS_INDEX } = require("../config");
const { captureException } = require("../error");

// Persist backfill state in a local file within the es-backfill directory
const STATE_FILE = path.join(__dirname, "backfill-state.json");

type BackfillState = {
  lastCreatedAt?: string;
};

const getState = async (): Promise<BackfillState> => {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e: any) {
    if (e && e.code === "ENOENT") {
      return {};
    }
    console.warn("[Verify] Unable to read state file, starting fresh:", e?.message ?? e);
    return {};
  }
};

const verifyCounts = async (start: Date, end: Date) => {
  const esRes: any = await esClient.search({
    index: STATS_INDEX,
    size: 0,
    body: {
      query: { range: { createdAt: { gte: start, lt: end } } },
      aggs: {
        by_day: {
          date_histogram: { field: "createdAt", calendar_interval: "day" },
          aggs: {
            by_type: { terms: { field: "type.keyword" } },
          },
        },
      },
    },
  });

  const esCounts: Record<string, Record<string, number>> = {};
  for (const dayBucket of esRes.body.aggregations.by_day.buckets as any[]) {
    const day = dayBucket.key_as_string.slice(0, 10);
    esCounts[day] = {};
    for (const typeBucket of dayBucket.by_type.buckets) {
      esCounts[day][typeBucket.key] = typeBucket.doc_count;
    }
  }

  const pgRows = await prismaCore.$queryRaw<
    {
      day: Date;
      type: string;
      count: bigint;
    }[]
  >`
    SELECT date_trunc('day', created_at) as day, type, COUNT(*) as count
    FROM "public"."StatEvent"
    WHERE created_at >= ${start} AND created_at < ${end}
    GROUP BY 1,2
    ORDER BY 1,2
  `;

  const pgCounts: Record<string, Record<string, number>> = {};
  for (const row of pgRows) {
    const day = row.day.toISOString().slice(0, 10);
    if (!pgCounts[day]) {
      pgCounts[day] = {};
    }
    pgCounts[day][row.type] = Number(row.count);
  }

  const days = Array.from(new Set([...Object.keys(esCounts), ...Object.keys(pgCounts)])).sort();
  for (const day of days) {
    const types = new Set([...Object.keys(esCounts[day] || {}), ...Object.keys(pgCounts[day] || {})]);
    for (const type of types) {
      const esCount = esCounts[day]?.[type] ?? 0;
      const pgCount = pgCounts[day]?.[type] ?? 0;
      console.log(`${day} ${type} ES:${esCount} PG:${pgCount}`);
    }
  }
};

const spotCheckIds = async (start: Date, end: Date) => {
  const { body }: any = await esClient.search({
    index: STATS_INDEX,
    size: 5,
    body: { query: { range: { createdAt: { gte: start, lt: end } } } },
  });
  const hits = body.hits.hits as { _id: string }[];
  for (const h of hits) {
    const exists = await prismaCore.statEvent.count({
      where: {
        es_id: h._id,
      },
    });
    console.log(`[SpotCheck] ${h._id} ${exists ? "found" : "missing"}`);
  }
};

const handler = async () => {
  try {
    const state = await getState();
    const end = state.lastCreatedAt ? new Date(state.lastCreatedAt) : new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    console.log(`[Verify] Comparing counts between ${start.toISOString()} and ${end.toISOString()}`);
    await verifyCounts(start, end);
    await spotCheckIds(start, end);
  } catch (error) {
    captureException(error, "[Verify] Error verifying backfill");
  } finally {
    await prismaCore.$disconnect();
  }
};

handler();
