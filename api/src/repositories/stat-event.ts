import { v4 as uuidv4 } from "uuid";

import { STATS_INDEX } from "../config";
import { StatEventType } from "../db/core";
import esClient from "../db/elastic";
import { prismaCore } from "../db/postgres";
import { Stats } from "../types";

function toPg(data: Partial<Stats>) {
  const mapped: any = {
    type: data.type,
    created_at: data.createdAt,
    click_user: data.clickUser,
    click_id: data.clickId,
    request_id: data.requestId,
    origin: data.origin,
    referer: data.referer,
    user_agent: data.userAgent,
    host: data.host,
    user: data.user,
    is_bot: data.isBot,
    is_human: data.isHuman ?? false,
    source: data.source || "publisher",
    source_id: data.sourceId || "",
    source_name: data.sourceName || "",
    status: data.status || "PENDING",
    from_publisher_id: data.fromPublisherId || "",
    from_publisher_name: data.fromPublisherName || "",
    to_publisher_id: data.toPublisherId || "",
    to_publisher_name: data.toPublisherName || "",
    mission_id: data.missionId,
    mission_client_id: data.missionClientId,
    mission_domain: data.missionDomain,
    mission_title: data.missionTitle,
    mission_postal_code: data.missionPostalCode,
    mission_department_name: data.missionDepartmentName,
    mission_organization_id: data.missionOrganizationId,
    mission_organization_name: data.missionOrganizationName,
    mission_organization_client_id: data.missionOrganizationClientId,
    tag: data.tag,
    tags: data.tags,
  };
  Object.keys(mapped).forEach((key) => mapped[key] === undefined && delete mapped[key]);
  return mapped;
}

// Map to Elasticsearch document by removing reserved/internal fields.
function toEs(data: Partial<Stats>) {
  const { _id, ...rest } = data as any;
  return rest;
}

function fromPg(row: any): Stats {
  return {
    _id: row.id,
    type: row.type,
    createdAt: row.created_at,
    clickUser: row.click_user ?? undefined,
    clickId: row.click_id ?? undefined,
    requestId: row.request_id ?? undefined,
    origin: row.origin,
    referer: row.referer,
    userAgent: row.user_agent,
    host: row.host,
    user: row.user ?? undefined,
    isBot: row.is_bot,
    isHuman: row.is_human,
    source: row.source,
    sourceId: row.source_id,
    sourceName: row.source_name,
    status: row.status,
    fromPublisherId: row.from_publisher_id,
    fromPublisherName: row.from_publisher_name,
    toPublisherId: row.to_publisher_id,
    toPublisherName: row.to_publisher_name,
    missionId: row.mission_id ?? undefined,
    missionClientId: row.mission_client_id ?? undefined,
    missionDomain: row.mission_domain ?? undefined,
    missionTitle: row.mission_title ?? undefined,
    missionPostalCode: row.mission_postal_code ?? undefined,
    missionDepartmentName: row.mission_department_name ?? undefined,
    missionOrganizationId: row.mission_organization_id ?? undefined,
    missionOrganizationName: row.mission_organization_name ?? undefined,
    missionOrganizationClientId: row.mission_organization_client_id ?? undefined,
    tag: row.tag ?? undefined,
    tags: row.tags ?? undefined,
  } as Stats;
}

export async function createStatEvent(event: Stats): Promise<string> {
  // Render id here to share it between es and pg
  const id = event._id || uuidv4();
  if (getReadStatsFrom() === "pg") {
    await prismaCore.statEvent.create({ data: { id, ...toPg(event) } });
    if (getWriteStatsDual()) {
      await esClient.index({ index: STATS_INDEX, id, body: toEs(event) });
    }
    return id;
  }
  await esClient.index({ index: STATS_INDEX, id, body: toEs(event) });
  if (getWriteStatsDual()) {
    await prismaCore.statEvent.create({ data: { id, ...toPg(event) } });
  }
  return id;
}

export async function updateStatEventById(id: string, patch: Partial<Stats>) {
  const data = toPg(patch);
  if (getReadStatsFrom() === "pg") {
    await prismaCore.statEvent.update({ where: { id }, data });
    if (getWriteStatsDual()) {
      await esClient.update({ index: STATS_INDEX, id, body: { doc: patch } });
    }
    return;
  }
  await esClient.update({ index: STATS_INDEX, id, body: { doc: patch } });
  if (getWriteStatsDual()) {
    try {
      await prismaCore.statEvent.update({ where: { id }, data });
    } catch (error) {
      console.error(`[StatEvent] Error updating stat event ${id}:`, error);
    }
  }
}

export async function getStatEventById(id: string): Promise<Stats | null> {
  if (getReadStatsFrom() === "pg") {
    const pgRes = await prismaCore.statEvent.findUnique({ where: { id } });
    return pgRes ? fromPg(pgRes) : null;
  }
  try {
    const esRes = await esClient.get({ index: STATS_INDEX, id });
    return { ...esRes.body._source, _id: esRes.body._id } as Stats;
  } catch {
    return null;
  }
}

export async function findRecentByTypeAndClickId(type: StatEventType, clickId: string, minutes: number): Promise<Stats | null> {
  if (getReadStatsFrom() === "pg") {
    const from = new Date(Date.now() - minutes * 60 * 1000);
    const pgRes = await prismaCore.statEvent.findFirst({
      where: { type, click_id: clickId, created_at: { gte: from } },
      orderBy: { created_at: "desc" },
    });
    return pgRes ? fromPg(pgRes) : null;
  }
  const { body } = await esClient.search({
    index: STATS_INDEX,
    body: {
      query: {
        bool: {
          must: [{ term: { "type.keyword": type as string } }, { term: { "clickId.keyword": clickId } }, { range: { createdAt: { gte: `now-${minutes}m/m`, lte: "now/m" } } }],
        },
      },
    },
    size: 1,
  });
  if (body.hits.total.value) {
    const hit = body.hits.hits[0];
    return { ...hit._source, _id: hit._id } as Stats;
  }
  return null;
}

export async function count() {
  if (getReadStatsFrom() === "pg") {
    return prismaCore.statEvent.count();
  }
  const { body } = await esClient.count({ index: STATS_INDEX });
  return body.count as number;
}

const statEventRepository = {
  createStatEvent,
  updateStatEventById,
  getStatEventById,
  findRecentByTypeAndClickId,
  count,
};

export default statEventRepository;

// Helpers to evaluate feature flags at call time to avoid stale values due to module caching in tests
function getReadStatsFrom(): "es" | "pg" {
  return (process.env.READ_STATS_FROM as "es" | "pg") || "es";
}

function getWriteStatsDual(): boolean {
  return process.env.WRITE_STATS_DUAL === "true";
}
