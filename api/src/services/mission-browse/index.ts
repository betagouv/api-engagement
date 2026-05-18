import type { MissionBrowse, MissionBrowseFacetCount, MissionBrowseFilters, MissionBrowseResponse, MissionDetailResponse } from "@engagement/dto";

import { PUBLISHER_IDS } from "@/config";
import { missionService } from "@/services/mission";
import { missionSearchClient } from "@/services/search/collections/missions/client";
import { INDEXED_TAXONOMY_KEYS, IndexedTaxonomyKey } from "@/services/search/collections/missions/fields";
import { MissionRecord } from "@/types/mission";
import { getMissionTrackedApplicationUrl } from "@/utils/mission";

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

const toMissionBrowse = (mission: MissionRecord): MissionBrowse => {
  return {
    id: mission.id,
    title: mission.title,
    description: mission.description ?? null,
    city: mission.city ?? null,
    departmentCode: mission.departmentCode ?? null,
    departmentName: mission.departmentName ?? null,
    domain: mission.domain ?? null,
    domainOriginal: mission.domainOriginal ?? null,
    domainLogo: mission.domainLogo ?? null,
    photo: mission.domainLogo ?? mission.organizationLogo ?? mission.publisherLogo ?? null,
    organizationName: mission.organizationName ?? null,
    organizationLogo: mission.organizationLogo ?? null,
    publisherName: mission.publisherName ?? null,
    publisherLogo: mission.publisherLogo ?? null,
    applicationUrl: mission.applicationUrl ?? null,
    schedule: mission.schedule ?? null,
  };
};

const toMissionDetailPayload = (mission: MissionRecord): MissionDetailResponse => {
  const addr = mission.addresses[0] ?? null;
  const addressParts = [addr?.street, addr?.postalCode && addr?.city ? `${addr.postalCode} ${addr.city}` : (addr?.city ?? null)].filter(Boolean);

  const hasCompensation = mission.compensationAmount != null || mission.compensationAmountMax != null;

  return {
    id: mission.id,
    title: mission.title,
    domain: mission.domain ?? mission.domainOriginal ?? null,
    domainLogo: mission.domainLogo ?? null,
    type: mission.type ?? null,
    publisherName: mission.publisherName ?? null,
    publisherLogo: mission.publisherLogo ?? null,
    organizationName: mission.organizationName ?? null,
    organizationLogo: mission.organizationLogo ?? null,
    location: addr
      ? {
          city: addr.city ?? null,
          address: addressParts.length > 0 ? addressParts.join(", ") : null,
          lat: addr.location?.lat ?? null,
          lon: addr.location?.lon ?? null,
        }
      : null,
    startAt: mission.startAt ? mission.startAt.toISOString() : null,
    endAt: mission.endAt ? mission.endAt.toISOString() : null,
    duration: mission.duration ?? null,
    schedule: mission.schedule ?? null,
    compensation: hasCompensation
      ? {
          amount: mission.compensationAmount ?? null,
          amountMax: mission.compensationAmountMax ?? null,
          unit: mission.compensationUnit ?? null,
          type: mission.compensationType ?? null,
        }
      : null,
    descriptionHtml: mission.descriptionHtml ?? null,
    description: mission.description ?? null,
    applicationUrl: getMissionTrackedApplicationUrl(mission, PUBLISHER_IDS.API_ENGAGEMENT),
    photo: mission.domainLogo ?? mission.organizationLogo ?? mission.publisherLogo ?? null,
    remote: mission.remote ?? null,
    openToMinors: mission.openToMinors ?? null,
    reducedMobilityAccessible: mission.reducedMobilityAccessible ?? null,
    places: mission.places ?? null,
  };
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

  async findById(id: string): Promise<MissionDetailResponse | null> {
    const mission = await missionService.findOneMissionBy({ id, deletedAt: null, statusCode: "ACCEPTED" });
    if (!mission) {
      return null;
    }
    return toMissionDetailPayload(mission);
  },
};
