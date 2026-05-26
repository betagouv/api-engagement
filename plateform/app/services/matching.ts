import type { MissionMatchResponse } from "@engagement/dto";
import { client } from "~/services/client";

export async function fetchMatches(userScoringId: string, limit = 5, offset = 0, signal?: AbortSignal): Promise<MissionMatchResponse> {
  return client.get<MissionMatchResponse>(`/api/missions/match?userScoringId=${encodeURIComponent(userScoringId)}&limit=${limit}&offset=${offset}`, signal);
}
