import dotenv from "dotenv";
import type { Prisma } from "../db/core";
import type { Stats } from "../types";

const args = process.argv.slice(2);

const envArgIndex = args.indexOf("--env");
if (envArgIndex !== -1 && args[envArgIndex + 1]) {
  dotenv.config({ path: args[envArgIndex + 1] });
} else {
  dotenv.config();
}

/**
 * Optionally override endpoints with:
 *   --es <elastic_url> --db <postgres_url>
 */

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

const BATCH_SIZE = 1000;
const BACKFILL_KEY = "stat_event_es_to_pg";

type BackfillState = {
  lastCreatedAt?: string;
};

const ensureBackfillTable = async () => {
  await prismaCore.$executeRaw`
    CREATE TABLE IF NOT EXISTS backfill_state (
      id TEXT PRIMARY KEY,
      state JSONB NOT NULL DEFAULT '{}'::jsonb
    )
  `;
};

const getState = async (): Promise<BackfillState> => {
  await ensureBackfillTable();
  const rows = await prismaCore.$queryRaw<{ state: Prisma.JsonValue }[]>`
    SELECT state FROM backfill_state WHERE id = ${BACKFILL_KEY}
  `;
  if (rows.length) {
    const value = rows[0].state as any;
    return value || {};
  }
  return {};
};

const saveState = async (state: BackfillState) => {
  await ensureBackfillTable();
  await prismaCore.$executeRaw`
    INSERT INTO backfill_state(id, state)
    VALUES (${BACKFILL_KEY}, ${state}::jsonb)
    ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state
  `;
};

const mapDoc = (doc: Stats) => {
  const allowedSources = new Set(["api", "widget", "campaign", "seo", "jstag", "publisher"]);
  const allowedTypes = new Set(["click", "print", "apply", "account"]);
  const allowedStatuses = new Set(["PENDING", "VALIDATED", "CANCEL", "CANCELED", "REFUSED", "CARRIED_OUT"]);

  const safeString = (v: any, fallback = ""): string => (v == null ? fallback : String(v));
  const safeNullableString = (v: any): string | null => (v == null ? null : String(v));
  const safeBool = (v: any): boolean => Boolean(v);
  const safeDate = (v: any): Date => {
    const d = v instanceof Date ? v : new Date(v);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const source = allowedSources.has(doc.source as any) ? (doc.source as any) : ("api" as any);
  const type = allowedTypes.has(doc.type as any) ? (doc.type as any) : ("click" as any);
  const status = allowedStatuses.has(String(doc.status)) ? (doc.status as any) : ("PENDING" as any);

  const obj: any = {
    type,
    created_at: safeDate((doc as any).createdAt),
    click_user: safeNullableString((doc as any).clickUser),
    click_id: safeNullableString((doc as any).clickId),
    request_id: safeNullableString((doc as any).requestId),
    origin: safeString((doc as any).origin),
    referer: safeString((doc as any).referer),
    user_agent: safeString((doc as any).userAgent),
    host: safeString((doc as any).host),
    user: safeNullableString((doc as any).user),
    is_bot: safeBool((doc as any).isBot),
    is_human: safeBool((doc as any).isHuman),
    source,
    source_id: safeString((doc as any).sourceId),
    source_name: safeString((doc as any).sourceName),
    status,
    from_publisher_id: safeString((doc as any).fromPublisherId),
    from_publisher_name: safeString((doc as any).fromPublisherName),
    to_publisher_id: safeString((doc as any).toPublisherId),
    to_publisher_name: safeString((doc as any).toPublisherName),
    mission_id: safeNullableString((doc as any).missionId),
    mission_client_id: safeNullableString((doc as any).missionClientId),
    mission_domain: safeNullableString((doc as any).missionDomain),
    mission_title: safeNullableString((doc as any).missionTitle),
    mission_postal_code: (doc as any).missionPostalCode == null ? null : String((doc as any).missionPostalCode),
    mission_department_name: safeNullableString((doc as any).missionDepartmentName),
    mission_organization_id: safeNullableString((doc as any).missionOrganizationId),
    mission_organization_name: safeNullableString((doc as any).missionOrganizationName),
    mission_organization_client_id: safeNullableString((doc as any).missionOrganizationClientId),
    tag: safeNullableString((doc as any).tag),
    tags: Array.isArray((doc as any).tags) ? (doc as any).tags.map((t: any) => String(t)) : [],
  };

  // Only set id if present; otherwise let Prisma default (uuid()) apply.
  if ((doc as any)._id) {
    obj.id = String((doc as any)._id);
  }

  return obj;
};

const handler = async () => {
  let dataToCreate: any[] = [];
  try {
    const start = new Date();
    console.log(`[Backfill] Started at ${start.toISOString()}.`);
    let created = 0;
    let scrollId: string | null = null;
    const state = await getState();
    // Use gte so that on resume we reprocess the last timestamp; duplicates are
    // ignored by createMany with skipDuplicates.
    const query = state.lastCreatedAt ? { range: { createdAt: { gte: state.lastCreatedAt } } } : { match_all: {} };

    while (true) {
      let hits: { _id: string; _source: Stats }[] = [];

      if (scrollId) {
        const { body } = await esClient.scroll({
          scroll: "5m",
          scroll_id: scrollId,
        });
        scrollId = body._scroll_id;
        hits = body.hits.hits;
      } else {
        const { body } = await esClient.search({
          index: STATS_INDEX,
          scroll: "5m",
          size: BATCH_SIZE,
          body: { query, sort: [{ createdAt: "asc" }] },
        });
        scrollId = body._scroll_id;
        hits = body.hits.hits as { _id: string; _source: Stats }[];
        console.log(`[Backfill] Total hits ${body.hits.total.value}, scrollId ${scrollId}`);
      }

      if (hits.length === 0) {
        break;
      }

      dataToCreate = hits.map((h) => mapDoc(h._source));
      if (dataToCreate.length) {
        const res = await prismaCore.statEvent.createMany({ data: dataToCreate, skipDuplicates: true });
        created += res.count;
        console.log(`[Backfill] Created ${res.count} docs, ${created} so far (${dataToCreate[0].created_at.toISOString()}).`);
      }

      const last = hits[hits.length - 1];
      state.lastCreatedAt = last._source.createdAt as any;
      await saveState(state);
    }

    console.log(`[Backfill] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s.`);
  } catch (error) {
    console.log(dataToCreate);
    console.error(error);
  } finally {
    await prismaCore.$disconnect();
  }
};

handler();
