import type { MissionBrowseFilters, MissionBrowseResponse, MissionDetailResponse } from "@engagement/dto";

const appendMulti = (params: URLSearchParams, key: string, values?: string | string[]) => {
  if (!values?.length) return;
  for (const value of Array.isArray(values) ? values : [values]) params.append(key, value);
};

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { signal });
  const json = (await res.json()) as { ok: boolean; data?: T; code?: string };
  if (!res.ok || !json.ok) throw new Error(json.code ?? `fetch error on GET ${path}`);
  return json.data as T;
}

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

  return get<MissionBrowseResponse>(`/api/missions/browse?${params.toString()}`, signal);
}

export const fetchMissionDetail = (id: string): Promise<MissionDetailResponse> => get<MissionDetailResponse>(`/api/missions/browse/${id}`);
