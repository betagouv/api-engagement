import type { MissionMatchResponse } from "@engagement/dto";
import { client } from "~/services/client";

// L'API retourne au maximum 100 résultats en une fois. La plateforme les affiche ensuite 10 par 10.
export const RESULTS_PAGE_SIZE = 10;
export const MATCHING_RESULTS_LIMIT = 100;

export async function fetchMatches(userScoringId: string, signal?: AbortSignal): Promise<MissionMatchResponse> {
  return client.get<MissionMatchResponse>(`/api/missions/match?userScoringId=${encodeURIComponent(userScoringId)}`, signal);
}

export function paginateMatchingResults<T>(items: T[], requestedPage: number) {
  const limitedItems = items.slice(0, MATCHING_RESULTS_LIMIT);
  const totalResults = limitedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / RESULTS_PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const pageStart = (page - 1) * RESULTS_PAGE_SIZE;

  return {
    items: limitedItems.slice(pageStart, pageStart + RESULTS_PAGE_SIZE),
    page,
    totalPages,
    totalResults,
  };
}

// Cache mémoire du lot complet, indexé par userScoringId.
// Évite un re-fetch entre deux visites de /results/:id ; invalidé quand le scoring est mis à jour.
const initialMatchesCache = new Map<string, Promise<MissionMatchResponse>>();

export function fetchInitialMatches(userScoringId: string): Promise<MissionMatchResponse> {
  const existing = initialMatchesCache.get(userScoringId);
  if (existing) return existing;

  const promise = fetchMatches(userScoringId).catch((err) => {
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
