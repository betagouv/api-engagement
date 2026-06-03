import type { MissionMatchResponse } from "@engagement/dto";
import { client } from "~/services/client";

// Tailles de page partagées entre le préchargement (LoadingRecap) et le hook de résultats.
export const PINNED_RESULTS_LIMIT = 5;
export const OTHER_RESULTS_PAGE_SIZE = 8;

export async function fetchMatches(userScoringId: string, limit = 5, offset = 0, signal?: AbortSignal): Promise<MissionMatchResponse> {
  return client.get<MissionMatchResponse>(`/api/missions/match?userScoringId=${encodeURIComponent(userScoringId)}&limit=${limit}&offset=${offset}`, signal);
}

export type InitialMatches = {
  pinned: MissionMatchResponse;
  other: MissionMatchResponse;
};

// Cache mémoire des résultats de la 1re page, indexé par userScoringId.
// Permet de lancer le chargement pendant l'écran de transition (LoadingRecap)
// puis de le réutiliser à l'arrivée sur /results/:id, sans re-fetch.
const initialMatchesCache = new Map<string, Promise<InitialMatches>>();

export function prefetchInitialMatches(userScoringId: string): Promise<InitialMatches> {
  const existing = initialMatchesCache.get(userScoringId);
  if (existing) return existing;

  const promise = Promise.all([fetchMatches(userScoringId, PINNED_RESULTS_LIMIT), fetchMatches(userScoringId, OTHER_RESULTS_PAGE_SIZE, PINNED_RESULTS_LIMIT)])
    .then(([pinned, other]) => ({ pinned, other }))
    .catch((err) => {
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
