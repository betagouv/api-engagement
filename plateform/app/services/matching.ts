import type { MissionMatchResponse } from "@engagement/dto";

import api from "~/services/api";

export async function fetchMatches(userScoringId: string, limit = 5, offset = 0): Promise<MissionMatchResponse> {
  return api.get<MissionMatchResponse>(`/missions/match?userScoringId=${encodeURIComponent(userScoringId)}&limit=${limit}&offset=${offset}`);
}
