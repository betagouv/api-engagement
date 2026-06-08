import type { MissionBrowseFacetCount, MissionBrowseFilters, MissionBrowseResponse, MissionDetailResponse } from "@engagement/dto";

import { missionService } from "@/services/mission";
import { missionSearchClient } from "@/services/search/collections/missions/client";
import { INDEXED_TAXONOMY_KEYS, IndexedTaxonomyKey } from "@/services/search/collections/missions/fields";
import { toMissionBrowse, toMissionDetailPayload } from "./transformers";

const FACET_FIELDS = [...INDEXED_TAXONOMY_KEYS, "departmentCodes"];

type BrowseTaxonomyParams = Partial<Record<IndexedTaxonomyKey, string | string[]>>;
type BrowseParams = BrowseTaxonomyParams &
  Omit<MissionBrowseFilters, "page" | "pageSize"> & {
    page: number;
    pageSize: number;
  };

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

  const publisherIds = toArray(params.publisherId);
  if (publisherIds?.length) {
    if (publisherIds.length === 1) {
      parts.push(`publisherId:=${escapeTypesenseFilterValue(publisherIds[0])}`);
    } else {
      parts.push(buildTypesenseListFilter("publisherId", publisherIds));
    }
  }

  const deptCodes = toArray(params.departmentCode);
  if (deptCodes?.length) {
    parts.push(buildTypesenseListFilter("departmentCodes", deptCodes));
  }

  for (const field of INDEXED_TAXONOMY_KEYS) {
    const vals = toArray(params[field]);
    if (vals?.length) {
      parts.push(buildTypesenseListFilter(field, vals));
    }
  }

  return parts.join(" && ");
};

export const missionBrowseService = {
  async browse(params: BrowseParams): Promise<MissionBrowseResponse> {
    const filterBy = buildFilterBy(params);

    const tsResult = await (async () => {
      try {
        return await missionSearchClient.search({
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

    const missions = await missionService.findMissionsByIds(ids);
    const data = missions.map(toMissionBrowse);

    const facets: Record<string, MissionBrowseFacetCount[]> = {};
    for (const facetResult of tsResult.facet_counts ?? []) {
      facets[facetResult.field_name] = facetResult.counts.map((c) => ({ key: c.value, count: c.count }));
    }

    return { data, total, page: params.page, pageSize: params.pageSize, facets };
  },

  async findById(id: string, addressId?: string | null): Promise<MissionDetailResponse | null> {
    const mission = await missionService.findOneMissionBy({ id, deletedAt: null, statusCode: "ACCEPTED" });
    if (!mission) {
      return null;
    }
    return toMissionDetailPayload(mission, addressId);
  },
};
