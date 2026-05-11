import { PUBLISHER_IDS } from "@/config";
import { missionService } from "@/services/mission";
import { missionSearchClient } from "@/services/search/collections/missions/client";
import { INDEXED_TAXONOMY_KEYS, IndexedTaxonomyKey } from "@/services/search/collections/missions/fields";
import { MissionRecord } from "@/types/mission";
import { getMissionTrackedApplicationUrl } from "@/utils/mission";

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

export type MissionDetailLocation = {
  city: string | null;
  address: string | null;
  lat: number | null;
  lon: number | null;
};

export type MissionDetailCompensation = {
  amount: number | null;
  amountMax: number | null;
  unit: string | null;
  type: string | null;
};

export type MissionDetailPayload = {
  id: string;
  title: string;
  domain: string | null;
  domainLogo: string | null;
  type: string | null;
  publisherName: string | null;
  publisherLogo: string | null;
  organizationName: string | null;
  organizationLogo: string | null;
  location: MissionDetailLocation | null;
  startAt: string | null;
  endAt: string | null;
  duration: number | null;
  schedule: string | null;
  compensation: MissionDetailCompensation | null;
  descriptionHtml: string | null;
  description: string | null;
  applicationUrl: string;
  photo: string | null;
  remote: "no" | "possible" | "full" | null;
  openToMinors: boolean | null;
  reducedMobilityAccessible: boolean | null;
  places: number | null;
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

const toMissionDetailPayload = (mission: MissionRecord): MissionDetailPayload => {
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
  async browse(params: BrowseParams): Promise<BrowseResult> {
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

    const data = await missionService.findMissionsByIds(ids);

    const facets: Record<string, FacetCount[]> = {};
    for (const facetResult of tsResult.facet_counts ?? []) {
      facets[facetResult.field_name] = facetResult.counts.map((c) => ({ key: c.value, count: c.count }));
    }

    return { data, total, page: params.page, pageSize: params.pageSize, facets };
  },

  async findById(id: string): Promise<MissionDetailPayload | null> {
    const mission = await missionService.findOneMission(id);
    if (!mission) {
      return null;
    }
    return toMissionDetailPayload(mission);
  },
};
