import type { MissionBrowseFilters, MissionBrowseResponse, MissionDetailResponse } from "@engagement/dto";

import api from "~/services/api";

const appendMulti = (params: URLSearchParams, key: string, values?: string | string[]) => {
  if (!values?.length) return;
  for (const value of Array.isArray(values) ? values : [values]) params.append(key, value);
};

export async function browseMissions(filters: MissionBrowseFilters, signal?: AbortSignal): Promise<MissionBrowseResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  appendMulti(params, "publisherId", filters.publisherId);
  appendMulti(params, "departmentCode", filters.departmentCode);
  appendMulti(params, "domaine", filters.domaine);
  appendMulti(params, "secteur_activite", filters.secteur_activite);
  appendMulti(params, "type_mission", filters.type_mission);
  appendMulti(params, "tranche_age", filters.tranche_age);

  return api.get<MissionBrowseResponse>(`/api/missions/browse?${params.toString()}`, signal);
}

export const fetchMissionDetail = (id: string): Promise<MissionDetailResponse> => api.get<MissionDetailResponse>(`/api/missions/browse/${id}`);
