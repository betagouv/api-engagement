import { prismaCore } from "../db/postgres";

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

const camelToSnake = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();

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

    let processed = 0;

    const pgWhere = buildPgWhere(where);
    const pgUpdate = buildPgUpdate(update);

    if (!Object.keys(pgWhere).length) {
      throw new Error("reassignStats requires at least one PostgreSQL-compatible filter");
    }

    if (Object.keys(pgUpdate).length) {
      await prismaCore.statEvent.updateMany({ where: pgWhere, data: pgUpdate });
    }

    return processed;
  } catch (error) {
    console.error("Error in reassignStats:", error);
    throw error;
  }
};
