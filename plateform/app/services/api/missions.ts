import type { MissionBrowseFilters, MissionBrowseResponse } from "@engagement/dto";

import { createApi } from "~/services/api";

const appendMulti = (params: URLSearchParams, key: string, values?: string | string[]) => {
  if (!values?.length) return;
  for (const value of Array.isArray(values) ? values : [values]) params.append(key, value);
};

export async function browseMissions(filters: MissionBrowseFilters, request: Request): Promise<MissionBrowseResponse> {
  const api = createApi(request);
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  appendMulti(params, "publisherId", filters.publisherId);
  appendMulti(params, "departmentCode", filters.departmentCode);
  appendMulti(params, "domaine", filters.domaine);
  appendMulti(params, "secteur_activite", filters.secteur_activite);
  appendMulti(params, "type_mission", filters.type_mission);
  appendMulti(params, "tranche_age", filters.tranche_age);

  return api.get<MissionBrowseResponse>(`/missions/browse?${params.toString()}`);
}
