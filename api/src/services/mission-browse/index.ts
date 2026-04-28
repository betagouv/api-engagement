import { TYPESENSE_MISSION_COLLECTION } from "@/config";
import { missionService } from "@/services/mission";
import { typesenseClient } from "@/services/typesense/client";
import { ensureMissionCollection } from "@/services/typesense/schema";
import { MissionRecord } from "@/types/mission";

const FACET_FIELDS = ["domaine", "engagement_intent", "type_mission", "tranche_age", "departmentCodes"];

export interface BrowseParams {
  publisherId?: string;
  departmentCode?: string | string[];
  domaine?: string | string[];
  engagement_intent?: string | string[];
  type_mission?: string | string[];
  tranche_age?: string | string[];
  page: number;
  pageSize: number;
}

export interface FacetCount {
  key: string;
  count: number;
}

export interface BrowseResult {
  data: MissionRecord[];
  total: number;
  page: number;
  pageSize: number;
  facets: Record<string, FacetCount[]>;
}

export class MissionBrowseIndexUnavailableError extends Error {
  cause?: unknown;

  constructor(cause?: unknown) {
    super("Mission browse index is unavailable");
    this.name = "MissionBrowseIndexUnavailableError";
    this.cause = cause;
  }
}

const toArray = (v: string | string[] | undefined): string[] | undefined => {
  if (v === undefined) {
    return undefined;
  }
  return Array.isArray(v) ? v : [v];
};

const escapeTypesenseFilterValue = (value: string): string => {
  return `\`${value.replace(/\\/g, "\\\\").replace(/`/g, "\\`")}\``;
};

const buildTypesenseListFilter = (field: string, values: string[]): string => {
  return `${field}:=[${values.map(escapeTypesenseFilterValue).join(",")}]`;
};

const buildFilterBy = (params: BrowseParams): string => {
  const parts: string[] = [];

  if (params.publisherId) {
    parts.push(`publisherId:=${escapeTypesenseFilterValue(params.publisherId)}`);
  }

  const deptCodes = toArray(params.departmentCode);
  if (deptCodes?.length) {
    parts.push(buildTypesenseListFilter("departmentCodes", deptCodes));
  }

  for (const field of ["domaine", "engagement_intent", "type_mission", "tranche_age"] as const) {
    const vals = toArray(params[field]);
    if (vals?.length) {
      parts.push(buildTypesenseListFilter(field, vals));
    }
  }

  return parts.join(" && ");
};

export const missionBrowseService = {
  async browse(params: BrowseParams): Promise<BrowseResult> {
    const filterBy = buildFilterBy(params);

    const tsResult = await (async () => {
      try {
        await ensureMissionCollection();
        return await typesenseClient
          .collections(TYPESENSE_MISSION_COLLECTION)
          .documents()
          .search({
            q: "*",
            query_by: "publisherId",
            filter_by: filterBy || undefined,
            facet_by: FACET_FIELDS.join(","),
            per_page: params.pageSize,
            page: params.page,
          });
      } catch (error) {
        throw new MissionBrowseIndexUnavailableError(error);
      }
    })();

    const ids = (tsResult.hits ?? []).map((h) => (h.document as { id: string }).id);
    const total = tsResult.found ?? 0;

    const data = await missionService.findMissionsByIds(ids);

    const facets: Record<string, FacetCount[]> = {};
    for (const facetResult of tsResult.facet_counts ?? []) {
      facets[facetResult.field_name] = facetResult.counts.map((c) => ({ key: c.value, count: c.count }));
    }

    return { data, total, page: params.page, pageSize: params.pageSize, facets };
  },
};
