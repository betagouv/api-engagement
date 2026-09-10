import type { MissionMatchItem } from "@engagement/dto";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { fetchInitialMatches, fetchMatches, RESULTS_PAGE_SIZE } from "~/services/matching";

export { RESULTS_PAGE_SIZE };

export function useMissionResults(userScoringId: string | undefined) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [firstPageItems, setFirstPageItems] = useState<MissionMatchItem[]>([]);
  const [items, setItems] = useState<MissionMatchItem[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [avgDistanceKmTop5, setAvgDistanceKmTop5] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Scoring auquel correspondent totalResults / totalPages / avgDistanceKmTop5 actuellement en state.
  // Pendant le chargement doux d'un re-scoring, ces stats restent celles de l'ancien scoring : ce champ
  // permet aux consommateurs (ex. results.viewed) d'attendre l'arrivée des stats du nouveau scoring.
  const [statsUserScoringId, setStatsUserScoringId] = useState<string | undefined>(undefined);

  // Dernier scoring chargé : changer de critères crée un nouveau scoring, donc une nouvelle URL, alors
  // que des résultats sont déjà affichés. On les garde à l'écran pendant le fetch (chargement doux)
  // au lieu de vider la page comme au premier chargement.
  const loadedUserScoringId = useRef<string | undefined>(undefined);

  // Page courante stockée dans l'URL (?page=N) : survit au refresh, au partage et au retour arrière.
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const setPage = (nextPage: number) => {
    setSearchParams(
      (params) => {
        if (nextPage <= 1) params.delete("page");
        else params.set("page", String(nextPage));
        return params;
      },
      { preventScrollReset: true },
    );
  };

  useEffect(() => {
    if (!userScoringId) {
      setError("Identifiant de scoring manquant.");
      setFirstPageItems([]);
      setItems([]);
      setLoading(false);
      return;
    }

    const isNewCriteria = loadedUserScoringId.current !== undefined && loadedUserScoringId.current !== userScoringId;
    loadedUserScoringId.current = userScoringId;

    let active = true;

    setError(null);
    if (isNewCriteria) {
      // La liste passe en « Chargement… » et la map garde ses pins jusqu'à l'arrivée des nouveaux résultats.
      setPageLoading(true);
      setFirstPageItems([]);
    } else {
      setLoading(true);
      setFirstPageItems([]);
      setItems([]);
    }

    // Résultats mis en cache par userScoringId (voir matching.ts) : pas de re-fetch au retour sur la page.
    fetchInitialMatches(userScoringId)
      .then((res) => {
        if (!active) return;
        setFirstPageItems(res.items);
        setItems(res.items);
        setTotalResults(res.total);
        setAvgDistanceKmTop5(res.avgDistanceKmTop5);
        setStatsUserScoringId(userScoringId);
      })
      .catch(() => {
        if (!active) return;
        setError("Impossible de charger les missions. Réessaie plus tard.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setPageLoading(false);
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
      // Première page pas encore chargée (arrivée sur un nouveau scoring) : c'est le fetch ci-dessus qui
      // posera les items, sinon on écraserait la liste avec celle du scoring précédent.
      if (firstPageItems.length === 0) return;
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
    statsUserScoringId,
  };
}
