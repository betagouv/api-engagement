import type { MatchResponse } from "~/types/matching";
import api from "~/services/api";

export async function fetchMatches(userScoringId: string, limit = 5, offset = 0): Promise<MatchResponse> {
  return api.get<MatchResponse>(`/poc/match?userScoringId=${encodeURIComponent(userScoringId)}&limit=${limit}&offset=${offset}`);
}
