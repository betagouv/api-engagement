import type { MissionMatchResponse } from "@engagement/dto";
import { client } from "~/services/client";

// Taille de page unique des résultats : la liste paginée et la map affichent les mêmes 10 missions.
export const RESULTS_PAGE_SIZE = 10;

export async function fetchMatches(userScoringId: string, limit = RESULTS_PAGE_SIZE, offset = 0, signal?: AbortSignal): Promise<MissionMatchResponse> {
  return client.get<MissionMatchResponse>(`/api/missions/match?userScoringId=${encodeURIComponent(userScoringId)}&limit=${limit}&offset=${offset}`, signal);
}

// Cache mémoire des résultats de la 1re page, indexé par userScoringId.
// Évite un re-fetch entre deux visites de /results/:id ; invalidé quand le scoring est mis à jour.
const initialMatchesCache = new Map<string, Promise<MissionMatchResponse>>();

export function fetchInitialMatches(userScoringId: string): Promise<MissionMatchResponse> {
  const existing = initialMatchesCache.get(userScoringId);
  if (existing) return existing;

  const promise = fetchMatches(userScoringId, RESULTS_PAGE_SIZE).catch((err) => {
    // En cas d'échec, on vide l'entrée pour autoriser un nouvel essai.
    initialMatchesCache.delete(userScoringId);
    throw err;
  });

  initialMatchesCache.set(userScoringId, promise);
  return promise;
}

export function invalidateInitialMatches(userScoringId: string) {
  initialMatchesCache.delete(userScoringId);
}
