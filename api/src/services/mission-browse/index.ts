import { missionService } from "@/services/mission";
import { missionTypesenseClient } from "@/services/typesense/mission-client";
import { INDEXED_TAXONOMY_KEYS, IndexedTaxonomyKey } from "@/services/typesense/mission-fields";
import { MissionRecord } from "@/types/mission";

const FACET_FIELDS = [...INDEXED_TAXONOMY_KEYS, "departmentCodes"];

type BrowseTaxonomyParams = Partial<Record<IndexedTaxonomyKey, string | string[]>>;

export type BrowseParams = BrowseTaxonomyParams & {
  publisherId?: string;
  departmentCode?: string | string[];
  page: number;
  pageSize: number;
};

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

  for (const field of INDEXED_TAXONOMY_KEYS) {
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
        return await missionTypesenseClient.search({
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
