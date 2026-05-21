import type { MissionMatchResponse } from "@engagement/dto";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  const json = (await res.json()) as { ok: boolean; data?: T; code?: string };
  if (!res.ok || !json.ok) throw new Error(json.code ?? `fetch error on GET ${path}`);
  return json.data as T;
}

export async function fetchMatches(userScoringId: string, limit = 5, offset = 0): Promise<MissionMatchResponse> {
  return get<MissionMatchResponse>(`/api/missions/match?userScoringId=${encodeURIComponent(userScoringId)}&limit=${limit}&offset=${offset}`);
}
