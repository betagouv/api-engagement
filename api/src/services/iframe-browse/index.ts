import { missionService } from "@/services/mission";
import { missionSearchClient } from "@/services/search/collections/missions/client";
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
import type { MissionRecord } from "@/types/mission";
import { capitalizeFirstLetter } from "@/utils";
import { normalizeToArray } from "@/utils/array";

export type IframeBrowseFilters = {
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

type IframeBrowseParams = IframeBrowseFilters & {
  baseFilterBy: string | null;
  moderatedBy?: string | null;
  page: number;
  pageSize: number;
};

type FacetSpec = {
  responseField: string;
  indexFields: string[];
  maxValues?: number;
};

type IframeBrowseFacetCount = {
  key: string;
  count: number;
  label?: string;
};

const FACETS: FacetSpec[] = [
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

export class IframeBrowseIndexUnavailableError extends Error {
  cause?: unknown;

  constructor(cause?: unknown) {
    super("Iframe browse index is unavailable");
    this.name = "IframeBrowseIndexUnavailableError";
    this.cause = cause;
  }
}

const buildAlwaysFilterParts = (params: IframeBrowseParams): string[] => {
  const parts = params.baseFilterBy ? [params.baseFilterBy] : [];

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

  return parts;
};

const buildFacetFilterParts = (params: IframeBrowseParams): Map<string, string> => {
  const parts = new Map<string, string>();
  const setList = (group: string, field: string, value: string | string[] | undefined) => {
    const values = normalizeToArray(value);
    if (values?.length) {
      parts.set(group, buildSearchListFilter(field, values));
    }
  };

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

const buildSearches = (params: IframeBrowseParams): SearchQueryParams<MissionIndexDocument>[] => {
  const alwaysParts = buildAlwaysFilterParts(params);
  const facetParts = buildFacetFilterParts(params);
  const filterByExcluding = (excludedGroup?: string): string | undefined => {
    const parts = [...alwaysParts, ...[...facetParts.entries()].filter(([group]) => group !== excludedGroup).map(([, part]) => part)];
    return parts.length ? parts.join(" && ") : undefined;
  };
  const q = params.search?.trim() || "*";
  const queryBy = "title,publisherOrganizationFacet,cityNames,mission_domain";

  const resultsSearch: SearchQueryParams<MissionIndexDocument> = {
    q,
    query_by: queryBy,
    filter_by: filterByExcluding(),
    per_page: params.pageSize,
    page: params.page,
    sort_by: params.lat !== undefined && params.lon !== undefined ? `locations(${params.lat},${params.lon}):asc,startAt:desc,createdAt:desc` : "startAt:desc,createdAt:desc",
  };
  const facetSearches: SearchQueryParams<MissionIndexDocument>[] = FACETS.map((facet) => ({
    q,
    query_by: queryBy,
    filter_by: filterByExcluding(facet.responseField),
    facet_by: facet.indexFields.join(","),
    max_facet_values: facet.maxValues ?? 100,
    per_page: 0,
  }));

  return [resultsSearch, ...facetSearches];
};

const mapFacetCounts = (spec: FacetSpec, result?: SearchQueryResponse<MissionIndexDocument>): IframeBrowseFacetCount[] => {
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

const toIframeMission = (mission: MissionRecord) => ({
  _id: mission.id,
  title: mission.title,
  domain: mission.domain,
  domainLogo: mission.domainLogo,
  organizationName: mission.organizationName,
  remote: mission.remote,
  city: mission.city ? capitalizeFirstLetter(mission.city) : mission.city,
  country: mission.country,
  postalCode: mission.postalCode,
  places: mission.places,
  tags: mission.tags,
  addresses: mission.addresses.map((address) => ({
    city: address.city ? capitalizeFirstLetter(address.city) : address.city,
    country: address.country,
    postalCode: address.postalCode,
    location: address.location,
  })),
});

type IframeBrowseResponse = {
  data: ReturnType<typeof toIframeMission>[];
  total: number;
  page: number;
  pageSize: number;
  facets: Record<string, IframeBrowseFacetCount[]>;
};

export const iframeBrowseService = {
  async browse(params: IframeBrowseParams): Promise<IframeBrowseResponse> {
    if (params.baseFilterBy === null) {
      return { data: [], total: 0, page: params.page, pageSize: params.pageSize, facets: {} };
    }

    let searchResults: SearchQueryResponse<MissionIndexDocument>[];
    try {
      searchResults = await missionSearchClient.multiSearch(buildSearches(params));
    } catch (error) {
      throw new IframeBrowseIndexUnavailableError(error);
    }

    const [resultsResult, ...facetResults] = searchResults;
    const ids = (resultsResult.hits ?? []).map((hit) => hit.document.id);
    const missions = await missionService.findMissionsByIds(ids, params.moderatedBy ?? null);
    const facets: Record<string, IframeBrowseFacetCount[]> = {};
    FACETS.forEach((spec, index) => {
      facets[spec.responseField] = mapFacetCounts(spec, facetResults[index]);
    });

    return {
      data: missions.map(toIframeMission),
      total: resultsResult.found ?? 0,
      page: params.page,
      pageSize: params.pageSize,
      facets,
    };
  },
};
