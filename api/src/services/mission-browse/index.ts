import type { MissionBrowseFacetCount, MissionBrowseFilters, MissionBrowseResponse, MissionDetailResponse } from "@engagement/dto";

import { missionService } from "@/services/mission";
import { missionSearchClient } from "@/services/search/collections/missions/client";
import { INDEXED_TAXONOMY_KEYS, IndexedTaxonomyKey, MISSION_BROWSE_FACET_FIELDS } from "@/services/search/collections/missions/fields";
import type { MissionIndexDocument } from "@/services/search/collections/missions/types";
import {
  buildSearchBooleanFilter,
  buildSearchEqualFilter,
  buildSearchListFilter,
  buildSearchNotListFilter,
  buildSearchNumberFilter,
  combineSearchAnd,
  combineSearchOr,
} from "@/services/search/filter";
import type { SearchQueryParams, SearchQueryResponse } from "@/services/search/types";
import { normalizeToArray } from "@/utils/array";
import { toMissionBrowse, toMissionDetailPayload } from "./transformers";

type BrowseTaxonomyParams = Partial<Record<IndexedTaxonomyKey, string | string[]>>;
export type MissionBrowseWidgetFilters = {
  search?: string;
  organization?: string | string[];
  department?: string | string[];
  domain?: string | string[];
  remote?: string | string[];
  country?: string | string[];
  schedule?: string | string[];
  action?: string | string[];
  beneficiary?: string | string[];
  minor?: string | string[];
  accessibility?: string | string[];
  start?: Date;
  duration?: number;
  lat?: number;
  lon?: number;
  distanceKm?: number;
};

export type MissionBrowseParams = BrowseTaxonomyParams &
  Omit<MissionBrowseFilters, "page" | "pageSize"> &
  MissionBrowseWidgetFilters & {
    diffuseurPublisherId: string;
    baseFilterBy?: string | null;
    widgetMode?: boolean;
    moderatedBy?: string | null;
    offset?: number;
    page: number;
    pageSize: number;
  };

type FacetSpec = {
  responseField: string;
  indexFields: string[];
  maxValues?: number;
};

export class MissionBrowseIndexUnavailableError extends Error {
  cause?: unknown;

  constructor(cause?: unknown) {
    super("Mission browse index is unavailable");
    this.name = "MissionBrowseIndexUnavailableError";
    this.cause = cause;
  }
}

const GENERIC_FACETS: FacetSpec[] = MISSION_BROWSE_FACET_FIELDS.map((field) => ({
  responseField: field,
  indexFields: [field],
  maxValues: field === "departmentCodes" ? 120 : 100,
}));

const WIDGET_FACETS: FacetSpec[] = [
  { responseField: "domain", indexFields: ["mission_domain"] },
  { responseField: "organization", indexFields: ["publisherOrganizationFacet"] },
  { responseField: "department", indexFields: ["departmentNames"], maxValues: 120 },
  { responseField: "remote", indexFields: ["remote"] },
  { responseField: "country", indexFields: ["countryCodes"], maxValues: 250 },
  { responseField: "schedule", indexFields: ["schedule"] },
  { responseField: "action", indexFields: ["tasks"] },
  { responseField: "beneficiary", indexFields: ["audience"] },
  { responseField: "minor", indexFields: ["openToMinors"] },
  { responseField: "accessibility", indexFields: ["reducedMobilityAccessible", "closeToTransport"] },
];

const buildAlwaysFilterParts = (params: MissionBrowseParams): string[] => {
  const baseFilter =
    params.baseFilterBy === undefined ? buildSearchEqualFilter("distributionPublisherIds", params.diffuseurPublisherId) : (params.baseFilterBy ?? "");
  const parts = baseFilter ? [baseFilter] : [];
  const publisherIds = normalizeToArray(params.publisherId);
  if (publisherIds?.length) {
    parts.push(publisherIds.length === 1 ? buildSearchEqualFilter("publisherId", publisherIds[0]) : buildSearchListFilter("publisherId", publisherIds));
  }
  if (params.widgetMode) {
    if (params.start) {
      parts.push(buildSearchNumberFilter("startAt", ">", Math.floor(params.start.getTime() / 1000)));
    }
    if (params.duration !== undefined) {
      parts.push(buildSearchNumberFilter("duration", "<=", params.duration));
    }
    if (params.lat !== undefined && params.lon !== undefined && params.distanceKm !== undefined) {
      const locationFilter = `locations:(${params.lat},${params.lon},${params.distanceKm} km)`;
      const remote = normalizeToArray(params.remote);
      parts.push(!remote?.length || remote.includes("local") ? combineSearchOr([locationFilter, buildSearchEqualFilter("remote", "local")]) : locationFilter);
    }
  }
  return parts;
};

const buildFacetFilterParts = (params: MissionBrowseParams): Map<string, string> => {
  const parts = new Map<string, string>();
  const setList = (group: string, field: string, value: string | string[] | undefined) => {
    const values = normalizeToArray(value);
    if (values?.length) {
      parts.set(group, buildSearchListFilter(field, values));
    }
  };

  setList("departmentCodes", "departmentCodes", params.departmentCode);
  for (const field of INDEXED_TAXONOMY_KEYS) {
    setList(field, field, params[field]);
  }

  if (!params.widgetMode) {
    return parts;
  }

  setList("domain", "mission_domain", params.domain);
  setList("organization", "publisherOrganizationClientId", params.organization);
  setList("department", "departmentNames", params.department);
  setList("remote", "remote", params.remote);
  setList("schedule", "schedule", params.schedule);
  setList("action", "tasks", params.action);
  setList("beneficiary", "audience", params.beneficiary);

  const countries = normalizeToArray(params.country);
  if (countries?.includes("NOT_FR") && !countries.includes("FR")) {
    parts.set("country", buildSearchNotListFilter("countryCodes", ["FR"]));
  } else if (countries?.includes("FR")) {
    parts.set("country", buildSearchEqualFilter("countryCodes", "FR"));
  }

  const minors = normalizeToArray(params.minor);
  if (minors?.includes("yes") && !minors.includes("no")) {
    parts.set("minor", buildSearchBooleanFilter("openToMinors", true));
  } else if (minors?.includes("no") && !minors.includes("yes")) {
    parts.set("minor", buildSearchBooleanFilter("openToMinors", false));
  }

  const accessibility = normalizeToArray(params.accessibility);
  const accessibilityParts = [
    ...(accessibility?.includes("reducedMobilityAccessible") ? [buildSearchBooleanFilter("reducedMobilityAccessible", true)] : []),
    ...(accessibility?.includes("closeToTransport") ? [buildSearchBooleanFilter("closeToTransport", true)] : []),
  ];
  if (accessibilityParts.length) {
    parts.set("accessibility", combineSearchAnd(accessibilityParts));
  }

  return parts;
};

const buildBrowseSearches = (params: MissionBrowseParams): { searches: SearchQueryParams<MissionIndexDocument>[]; facets: FacetSpec[] } => {
  const alwaysParts = buildAlwaysFilterParts(params);
  const facetParts = buildFacetFilterParts(params);
  const filterByExcluding = (excludedGroup?: string): string | undefined => {
    const parts = [...alwaysParts, ...[...facetParts.entries()].filter(([group]) => group !== excludedGroup).map(([, part]) => part)];
    return parts.length ? parts.join(" && ") : undefined;
  };

  const q = params.widgetMode ? params.search?.trim() || "*" : "*";
  const queryBy = params.widgetMode ? "title,publisherOrganizationFacet,cityNames,mission_domain" : "publisherId";
  const resultsSearch: SearchQueryParams<MissionIndexDocument> = {
    q,
    query_by: queryBy,
    filter_by: filterByExcluding(),
    ...(params.offset === undefined ? { per_page: params.pageSize, page: params.page } : { offset: params.offset, limit: params.pageSize }),
    ...(params.widgetMode
      ? {
          sort_by:
            params.lat !== undefined && params.lon !== undefined ? `locations(${params.lat},${params.lon}):asc,startAt:desc,createdAt:desc` : "startAt:desc,createdAt:desc",
        }
      : {}),
  };
  const facets = params.widgetMode ? WIDGET_FACETS : GENERIC_FACETS;
  const facetSearches: SearchQueryParams<MissionIndexDocument>[] = facets.map((facet) => ({
    q,
    query_by: queryBy,
    filter_by: filterByExcluding(facet.responseField),
    facet_by: facet.indexFields.join(","),
    max_facet_values: facet.maxValues ?? 100,
    per_page: 0,
  }));

  return { searches: [resultsSearch, ...facetSearches], facets };
};

const mapFacetCounts = (spec: FacetSpec, result?: SearchQueryResponse<MissionIndexDocument>): MissionBrowseFacetCount[] => {
  if (spec.responseField === "accessibility") {
    return spec.indexFields.map((field) => {
      const count = result?.facet_counts?.find((facet) => facet.field_name === field)?.counts.find((bucket) => bucket.value === "true")?.count ?? 0;
      return { key: field, count };
    });
  }

  const counts = result?.facet_counts?.find((facet) => facet.field_name === spec.indexFields[0])?.counts ?? [];
  if (spec.responseField === "organization") {
    return counts.map((bucket) => {
      const [key, label] = bucket.value.split("|||", 2);
      return { key, label: label || key, count: bucket.count };
    });
  }
  if (spec.responseField === "minor") {
    return counts.map((bucket) => ({ key: bucket.value === "true" ? "yes" : "no", count: bucket.count }));
  }
  return counts.map((bucket) => ({ key: bucket.value, count: bucket.count }));
};

export const missionBrowseService = {
  async browse(params: MissionBrowseParams): Promise<MissionBrowseResponse> {
    if (params.baseFilterBy === null) {
      return { data: [], total: 0, page: params.page, pageSize: params.pageSize, facets: {} };
    }

    const { searches, facets: facetSpecs } = buildBrowseSearches(params);
    let searchResults: SearchQueryResponse<MissionIndexDocument>[];
    try {
      searchResults = await missionSearchClient.multiSearch(searches);
    } catch (error) {
      throw new MissionBrowseIndexUnavailableError(error);
    }

    const [resultsResult, ...facetResults] = searchResults;
    const ids = (resultsResult.hits ?? []).map((hit) => hit.document.id);
    const missions = await missionService.findMissionsByIds(ids, params.moderatedBy ?? null);
    const facets: Record<string, MissionBrowseFacetCount[]> = {};
    facetSpecs.forEach((spec, index) => {
      facets[spec.responseField] = mapFacetCounts(spec, facetResults[index]);
    });

    return {
      data: missions.map(toMissionBrowse),
      total: resultsResult.found ?? 0,
      page: params.page,
      pageSize: params.pageSize,
      facets,
    };
  },

  async findById(id: string, diffuseurPublisherId: string, addressId?: string): Promise<MissionDetailResponse | null> {
    const mission = await missionService.findOneMissionBy({
      id,
      missionDiffusions: { some: { distributionPublisherId: diffuseurPublisherId } },
      deletedAt: null,
      statusCode: "ACCEPTED",
    });
    if (!mission) {
      return null;
    }
    return toMissionDetailPayload(mission, diffuseurPublisherId, addressId);
  },
};
