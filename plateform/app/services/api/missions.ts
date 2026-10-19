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
  if (filters.offset !== undefined) params.set("offset", String(filters.offset));
  appendMulti(params, "publisherId", filters.publisherId);
  appendMulti(params, "departmentCode", filters.departmentCode);
  appendMulti(params, "domaine_engagement", filters.domaine_engagement);
  appendMulti(params, "activite", filters.activite);
  appendMulti(params, "type_mission", filters.type_mission);
  appendMulti(params, "tranche_age", filters.tranche_age);
  appendMulti(params, "dispositif", filters.dispositif);
  // Le parser de query string de l'API est simple : exclusions et emplacements sont envoyés en JSON.
  if (filters.exclude) params.set("exclude", JSON.stringify(filters.exclude));
  if (filters.includeRemote) params.set("includeRemote", "true");
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.slots?.length) params.set("slots", JSON.stringify(filters.slots));

  return api.get<MissionBrowseResponse>(`/missions/browse?${params.toString()}`);
}
