import api from "~/services/api";
import type { BrowseFilters, BrowseResponse, MissionDetailResponse } from "~/types/api";

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

  return api.get<BrowseResponse>(`/missions/browse?${params.toString()}`, signal);
}

export const fetchMissionDetail = (id: string): Promise<MissionDetailResponse> => api.get<MissionDetailResponse>(`/missions/browse/${id}`);
