import type { MissionMatchItem } from "@engagement/dto";
import { useEffect, useState } from "react";
import { fetchInitialMatches, fetchMatches, RESULTS_PAGE_SIZE } from "~/services/matching";

export { RESULTS_PAGE_SIZE };

export function useMissionResults(userScoringId: string | undefined) {
  const [firstPageItems, setFirstPageItems] = useState<MissionMatchItem[]>([]);
  const [items, setItems] = useState<MissionMatchItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [avgDistanceKmTop5, setAvgDistanceKmTop5] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userScoringId) {
      setError("Identifiant de scoring manquant.");
      setFirstPageItems([]);
      setItems([]);
      setLoading(false);
      return;
    }

    let active = true;

    setLoading(true);
    setError(null);
    setPage(1);
    setFirstPageItems([]);
    setItems([]);

    // Résultats mis en cache par userScoringId (voir matching.ts) : pas de re-fetch au retour sur la page.
    fetchInitialMatches(userScoringId)
      .then((res) => {
        if (!active) return;
        setFirstPageItems(res.items);
        setItems(res.items);
        setTotalResults(res.total);
        setAvgDistanceKmTop5(res.avgDistanceKmTop5);
      })
      .catch(() => {
        if (!active) return;
        setError("Impossible de charger les missions. Réessaie plus tard.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userScoringId]);

  // Changement de page : les items courants sont conservés pendant le chargement pour que la map
  // ne se vide pas ; elle est reconstruite (pins + recadrage) à l'arrivée de la nouvelle page.
  useEffect(() => {
    if (!userScoringId) {
      return;
    }

    if (page === 1) {
      setItems(firstPageItems);
      setPageLoading(false);
      return;
    }

    let active = true;

    setPageLoading(true);
    fetchMatches(userScoringId, RESULTS_PAGE_SIZE, (page - 1) * RESULTS_PAGE_SIZE)
      .then((res) => {
        if (!active) return;
        setItems(res.items);
      })
      .catch(() => {
        if (!active) return;
        setError("Impossible de charger les missions. Réessaie plus tard.");
      })
      .finally(() => {
        if (!active) return;
        setPageLoading(false);
      });

    return () => {
      active = false;
    };
  }, [firstPageItems, page, userScoringId]);

  const totalPages = Math.max(1, Math.ceil(totalResults / RESULTS_PAGE_SIZE));

  return {
    items,
    page,
    setPage,
    totalPages,
    totalResults,
    avgDistanceKmTop5,
    loading,
    pageLoading,
    error,
  };
}
