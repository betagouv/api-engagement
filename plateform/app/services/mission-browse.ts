import api from "~/services/api";
import type { MissionDetailResponse } from "~/types/mission-detail";

import { API_URL } from "~/services/config";

export type FacetCount = { key: string; count: number };

export type BrowseMission = {
  _id: string;
  id: string;
  title: string;
  description: string | null;
  city: string | null;
  departmentCode: string | null;
  departmentName: string | null;
  domain: string | null;
  domainOriginal: string | null;
  domainLogo: string | null;
  organizationName: string | null;
  organizationLogo: string | null;
  publisherName: string | null;
  publisherLogo: string | null;
  applicationUrl: string | null;
  schedule: string | null;
};

export type BrowseResponse = {
  data: BrowseMission[];
  total: number;
  page: number;
  pageSize: number;
  facets: Record<string, FacetCount[]>;
};

export type BrowseFilters = {
  page?: number;
  pageSize?: number;
  publisherId?: string[];
  departmentCode?: string[];
  domaine?: string[];
  secteur_activite?: string[];
  type_mission?: string[];
  tranche_age?: string[];
};

const appendMulti = (params: URLSearchParams, key: string, values?: string[]) => {
  if (!values?.length) return;
  for (const value of values) params.append(key, value);
};

export async function browseMissions(filters: BrowseFilters, signal?: AbortSignal): Promise<BrowseResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  appendMulti(params, "publisherId", filters.publisherId);
  appendMulti(params, "departmentCode", filters.departmentCode);
  appendMulti(params, "domaine", filters.domaine);
  appendMulti(params, "secteur_activite", filters.secteur_activite);
  appendMulti(params, "type_mission", filters.type_mission);
  appendMulti(params, "tranche_age", filters.tranche_age);

  const response = await fetch(`${API_URL}/missions/browse?${params.toString()}`, { signal });
  if (!response.ok) throw new Error(`API error ${response.status} on /missions/browse`);

  const json = (await response.json()) as BrowseResponse & { ok: boolean; code?: string };
  if (!json.ok) throw new Error(json.code ?? "API error on /missions/browse");
  return json;
}

export const fetchMissionDetail = (id: string): Promise<MissionDetailResponse> => api.get<MissionDetailResponse>(`/missions/browse/${id}`);
