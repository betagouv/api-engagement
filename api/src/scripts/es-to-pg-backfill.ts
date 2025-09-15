import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import type { Stats } from "../types";
import { Prisma } from "@prisma/client";

const args = process.argv.slice(2);
const envArgIndex = args.indexOf("--env");
let envFile: string | undefined;

if (envArgIndex !== -1 && args[envArgIndex + 1]) {
  envFile = `.env.${args[envArgIndex + 1]}`;
}

if (!envFile) {
  const defaultFile = path.resolve(__dirname, "..", "..", ".env.es-to-pg-backfill");
  if (fs.existsSync(defaultFile)) {
    envFile = ".env.es-to-pg-backfill";
  }
}

if (envFile) {
  const envPath = path.resolve(__dirname, "..", "..", envFile);
  console.log(`Loading environment variables from ${envFile}`);
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const esClient = require("../db/elastic").default;
const { prismaCore } = require("../db/postgres");
const { STATS_INDEX } = require("../config");
const { captureException } = require("../error");

const BATCH_SIZE = 1000;
const BACKFILL_KEY = "stat_event_es_to_pg";

type BackfillState = {
  lastCreatedAt?: string;
};

const getState = async (): Promise<BackfillState> => {
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
  await prismaCore.$executeRaw`
    INSERT INTO backfill_state(id, state)
    VALUES (${BACKFILL_KEY}, ${state}::jsonb)
    ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state
  `;
};

const mapDoc = (doc: Stats) => ({
  id: doc._id,
  type: doc.type,
  created_at: new Date(doc.createdAt),
  click_user: doc.clickUser ?? null,
  click_id: doc.clickId ?? null,
  request_id: doc.requestId ?? null,
  origin: doc.origin,
  referer: doc.referer,
  user_agent: doc.userAgent,
  host: doc.host,
  user: doc.user ?? null,
  is_bot: doc.isBot,
  is_human: doc.isHuman,
  source: doc.source,
  source_id: doc.sourceId,
  source_name: doc.sourceName,
  status: doc.status ?? "PENDING",
  from_publisher_id: doc.fromPublisherId,
  from_publisher_name: doc.fromPublisherName,
  to_publisher_id: doc.toPublisherId,
  to_publisher_name: doc.toPublisherName,
  mission_id: doc.missionId ?? null,
  mission_client_id: doc.missionClientId ?? null,
  mission_domain: doc.missionDomain ?? null,
  mission_title: doc.missionTitle ?? null,
  mission_postal_code: doc.missionPostalCode ?? null,
  mission_department_name: doc.missionDepartmentName ?? null,
  mission_organization_id: doc.missionOrganizationId ?? null,
  mission_organization_name: doc.missionOrganizationName ?? null,
  mission_organization_client_id: doc.missionOrganizationClientId ?? null,
  tag: doc.tag ?? null,
  tags: doc.tags ?? [],
});

const handler = async () => {
  try {
    const start = new Date();
    console.log(`[Backfill] Started at ${start.toISOString()}.`);
    let created = 0;
    let scrollId: string | null = null;
    const state = await getState();
    // Use gte so that on resume we reprocess the last timestamp; duplicates are
    // ignored by createMany with skipDuplicates.
    const query = state.lastCreatedAt
      ? { range: { createdAt: { gte: state.lastCreatedAt } } }
      : { match_all: {} };

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

      const dataToCreate = hits.map((h) => mapDoc({ _id: h._id, ...h._source }));
      if (dataToCreate.length) {
        const res = await prismaCore.statEvent.createMany({ data: dataToCreate, skipDuplicates: true });
        created += res.count;
        console.log(`[Backfill] Created ${res.count} docs, ${created} so far.`);
      }

      const last = hits[hits.length - 1];
      state.lastCreatedAt = last._source.createdAt as any;
      await saveState(state);
    }

    console.log(`[Backfill] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s.`);
  } catch (error) {
    captureException(error, "[Backfill] Error while syncing docs.");
  } finally {
    await prismaCore.$disconnect();
  }
};

handler();
