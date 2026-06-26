import type { MissionBrowseFacetCount, MissionBrowseFilters, MissionBrowseResponse, MissionDetailResponse } from "@engagement/dto";

import { missionService } from "@/services/mission";
import { publisherDiffusionRuleService } from "@/services/publisher-diffusion-rule";
import { missionSearchClient } from "@/services/search/collections/missions/client";
import { publisherDiffusionRulesToMissionFilter } from "@/services/search/collections/missions/diffusion-rules-filter";
import { INDEXED_TAXONOMY_KEYS, IndexedTaxonomyKey, MISSION_BROWSE_FACET_FIELDS } from "@/services/search/collections/missions/fields";
import type { MissionIndexDocument } from "@/services/search/collections/missions/types";
import { buildSearchEqualFilter, buildSearchListFilter } from "@/services/search/filter";
import type { SearchQueryParams } from "@/services/search/types";
import { toMissionBrowse, toMissionDetailPayload } from "./transformers";

type BrowseTaxonomyParams = Partial<Record<IndexedTaxonomyKey, string | string[]>>;
type BrowseParams = BrowseTaxonomyParams &
  Omit<MissionBrowseFilters, "page" | "pageSize"> & {
    diffuseurPublisherId: string;
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

const emptyBrowseResponse = (params: Pick<BrowseParams, "page" | "pageSize">): MissionBrowseResponse => ({
  data: [],
  total: 0,
  page: params.page,
  pageSize: params.pageSize,
  facets: {},
});

const DEFAULT_MAX_FACET_VALUES = 100;
const MAX_FACET_VALUES_BY_FIELD: Partial<Record<(typeof MISSION_BROWSE_FACET_FIELDS)[number], number>> = {
  departmentCodes: 120,
};

const getMaxFacetValues = (field: (typeof MISSION_BROWSE_FACET_FIELDS)[number]): number => MAX_FACET_VALUES_BY_FIELD[field] ?? DEFAULT_MAX_FACET_VALUES;

// Part de filtre toujours appliquée à toutes les sous-requêtes (sécurité diffuseur), non rattachée à une
// facette : le `publisherId` demandé. Le filtre de diffusion est ajouté séparément en amont.
const buildAlwaysFilterPart = (params: BrowseParams): string | undefined => {
  const publisherIds = toArray(params.publisherId);
  if (!publisherIds?.length) {
    return undefined;
  }
  return publisherIds.length === 1 ? buildSearchEqualFilter("publisherId", publisherIds[0]) : buildSearchListFilter("publisherId", publisherIds);
};

// Part de filtre par champ facettable (clé = nom du champ indexé), uniquement pour les groupes ayant une
// sélection. Permet de recomposer un `filter_by` qui exclut le groupe d'une facette donnée (facettes
// disjonctives : un compteur ignore les sélections de son propre groupe mais respecte les autres groupes).
const buildFacetFilterParts = (params: BrowseParams): Map<string, string> => {
  const parts = new Map<string, string>();

  const deptCodes = toArray(params.departmentCode);
  if (deptCodes?.length) {
    parts.set("departmentCodes", buildSearchListFilter("departmentCodes", deptCodes));
  }

  for (const field of INDEXED_TAXONOMY_KEYS) {
    const vals = toArray(params[field]);
    if (vals?.length) {
      parts.set(field, buildSearchListFilter(field, vals));
    }
  }

  return parts;
};

const buildBrowseSearches = (params: BrowseParams, diffusionFilterBy?: string): SearchQueryParams<MissionIndexDocument>[] => {
  const alwaysParts = [diffusionFilterBy ?? "", buildAlwaysFilterPart(params) ?? ""].filter(Boolean);
  const facetParts = buildFacetFilterParts(params);

  const filterByExcluding = (excludedField?: string): string | undefined => {
    const parts = [...alwaysParts, ...[...facetParts.entries()].filter(([field]) => field !== excludedField).map(([, part]) => part)];
    return parts.length ? parts.join(" && ") : undefined;
  };

  const resultsSearch: SearchQueryParams<MissionIndexDocument> = { q: "*", query_by: "publisherId", filter_by: filterByExcluding(), per_page: params.pageSize, page: params.page };
  const facetSearches: SearchQueryParams<MissionIndexDocument>[] = MISSION_BROWSE_FACET_FIELDS.map((field) => ({
    q: "*",
    query_by: "publisherId",
    filter_by: filterByExcluding(field),
    facet_by: field,
    max_facet_values: getMaxFacetValues(field),
    per_page: 0,
  }));

  return [resultsSearch, ...facetSearches];
};

export const missionBrowseService = {
  async browse(params: BrowseParams): Promise<MissionBrowseResponse> {
    const rules = await publisherDiffusionRuleService.findRules({ publisherId: params.diffuseurPublisherId });
    const diffusionFilter = publisherDiffusionRulesToMissionFilter(rules);
    if (diffusionFilter.kind === "none") {
      return emptyBrowseResponse(params);
    }

    const searches = buildBrowseSearches(params, diffusionFilter.kind === "filter" ? diffusionFilter.filterBy : undefined);

    const searchResults = await (async () => {
      try {
        return await missionSearchClient.multiSearch(searches);
      } catch (error) {
        throw new MissionBrowseIndexUnavailableError(error);
      }
    })();

    const [resultsResult, ...facetResults] = searchResults;
    const ids = (resultsResult.hits ?? []).map((h) => (h.document as { id: string }).id);
    const total = resultsResult.found ?? 0;

    const missions = await missionService.findMissionsByIds(ids);
    const data = missions.map(toMissionBrowse);

    // Chaque facette lit ses compteurs depuis sa sous-requête dédiée (ordre identique à FACET_FIELDS).
    const facets: Record<string, MissionBrowseFacetCount[]> = {};
    MISSION_BROWSE_FACET_FIELDS.forEach((field, index) => {
      const facetCounts = facetResults[index]?.facet_counts?.find((f) => f.field_name === field)?.counts ?? [];
      facets[field] = facetCounts.map((c) => ({ key: c.value, count: c.count }));
    });

    return { data, total, page: params.page, pageSize: params.pageSize, facets };
  },

  async findById(id: string, diffuseurPublisherId: string, addressId?: string): Promise<MissionDetailResponse | null> {
    const rules = await publisherDiffusionRuleService.findRules({ publisherId: diffuseurPublisherId });
    const diffusionFilter = publisherDiffusionRulesToMissionFilter(rules);
    if (diffusionFilter.kind === "none") {
      return null;
    }

    const mission = await missionService.findOneMissionBy({
      id,
      ...(diffusionFilter.kind === "filter" ? diffusionFilter.missionWhere : {}),
      deletedAt: null,
      statusCode: "ACCEPTED",
    });
    if (!mission) {
      return null;
    }
    return toMissionDetailPayload(mission, diffuseurPublisherId, addressId);
  },
};
