import { STATS_INDEX } from "../config";
import esClient from "../db/elastic";
import { prismaCore } from "../db/postgres";
import { captureException } from "../error";
import { EsQuery } from "../types";

type ReassignStatsField =
  | "id"
  | "sourceId"
  | "sourceName"
  | "fromPublisherId"
  | "fromPublisherName"
  | "toPublisherId"
  | "toPublisherName"
  | "missionId"
  | "missionClientId"
  | "missionOrganizationId"
  | "missionOrganizationName"
  | "missionOrganizationClientId"
  | "missionPostalCode"
  | "missionDepartmentName"
  | "missionDomain"
  | "missionTitle"
  | "source"
  | "tag"
  | "tags"
  | "type"
  | "status"
  | "user";

export type ReassignStatsWhere = Partial<Record<ReassignStatsField, string | string[]>>;
export type ReassignStatsUpdate = Partial<Record<ReassignStatsField, string>>;

const ES_KEYWORD_FIELDS: Set<ReassignStatsField> = new Set([
  "sourceId",
  "sourceName",
  "fromPublisherId",
  "fromPublisherName",
  "toPublisherId",
  "toPublisherName",
  "missionId",
  "missionClientId",
  "missionOrganizationId",
  "missionOrganizationName",
  "missionOrganizationClientId",
  "missionPostalCode",
  "missionDepartmentName",
  "missionDomain",
  "missionTitle",
  "source",
  "tag",
  "tags",
  "type",
  "status",
  "user",
]);

const shouldWriteStatsDual = () => process.env.WRITE_STATS_DUAL === "true";

const camelToSnake = (value: string) =>
  value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/([A-Z])([A-Z][a-z])/g, "$1_$2").toLowerCase();

const toEsField = (field: ReassignStatsField) => {
  if (field === "id") {
    return "_id";
  }
  if (ES_KEYWORD_FIELDS.has(field)) {
    return `${field}.keyword`;
  }
  return field;
};

const buildEsQuery = (where: ReassignStatsWhere): EsQuery => {
  const query: EsQuery = { bool: { must: [], must_not: [], should: [], filter: [] } };

  Object.entries(where).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    const field = toEsField(key as ReassignStatsField);

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return;
      }
      query.bool.filter.push({ terms: { [field]: value } });
    } else {
      query.bool.filter.push({ term: { [field]: value } });
    }
  });

  return query;
};

const buildPgWhere = (where: ReassignStatsWhere) => {
  return Object.entries(where).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (value === undefined || value === null) {
      return acc;
    }
    const column = key === "id" ? "id" : camelToSnake(key);
    acc[column] = Array.isArray(value) ? { in: value } : value;
    return acc;
  }, {});
};

const buildPgUpdate = (update: ReassignStatsUpdate) => {
  return Object.entries(update).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value === undefined || value === null) {
      return acc;
    }
    const column = key === "id" ? "id" : camelToSnake(key);
    acc[column] = value;
    return acc;
  }, {});
};

export const reassignStats = async (where: ReassignStatsWhere, update: ReassignStatsUpdate) => {
  try {
    if (!Object.keys(where).length) {
      throw new Error("reassignStats requires at least one filter");
    }
    if (!Object.keys(update).length) {
      return 0;
    }

    const esQuery = buildEsQuery(where);
    let processed = 0;
    let scrollId = null;

    while (true) {
      let hits: Array<{ _id: string }> = [];

      if (scrollId) {
        const { body }: {
          body: {
            _scroll_id?: string | null;
            hits: { hits: Array<{ _id: string }> };
          };
        } = await esClient.scroll({
          scroll: "20m",
          scroll_id: scrollId,
        });
        hits = body.hits.hits;
        scrollId = body._scroll_id ?? scrollId;
      } else {
        const { body }: {
          body: {
            _scroll_id?: string | null;
            hits: { hits: Array<{ _id: string }> };
          };
        } = await esClient.search({
          index: STATS_INDEX,
          scroll: "20m",
          body: {
            query: esQuery,
            size: 10000,
            track_total_hits: true,
          },
        });
        scrollId = body._scroll_id ?? null;
        hits = body.hits.hits;
      }
      if (hits.length === 0) {
        break;
      }

      const bulkOps = hits.flatMap((e: { _id: string }) => [
        { update: { _index: STATS_INDEX, _id: e._id } },
        {
          doc: update,
        },
      ]);

      const { body: response } = await esClient.bulk({ refresh: true, body: bulkOps });
      processed += response.items.length;

      if (response.errors) {
        processed -= response.items.filter((item: any) => item.update?.error).length;
        const errors = response.items.filter((item: any) => item.update && item.update.error);
        captureException("Reassign stats failed", JSON.stringify(errors, null, 2));
      }
    }

    if (shouldWriteStatsDual()) {
      const pgWhere = buildPgWhere(where);
      const pgUpdate = buildPgUpdate(update);

      if (!Object.keys(pgWhere).length) {
        throw new Error("reassignStats requires at least one PostgreSQL-compatible filter");
      }

      if (Object.keys(pgUpdate).length) {
        await prismaCore.statEvent.updateMany({ where: pgWhere, data: pgUpdate });
      }
    }
    return processed;
  } catch (error) {
    console.error("Error in reassignStats:", error);
    throw error;
  }
};
