import { useEffect, useMemo, useState } from "react";
import type { MissionMatchItem } from "@engagement/dto";
import { fetchMatches, OTHER_RESULTS_PAGE_SIZE, PINNED_RESULTS_LIMIT, prefetchInitialMatches } from "~/services/matching";

export { OTHER_RESULTS_PAGE_SIZE, PINNED_RESULTS_LIMIT };
export const VISIBLE_PAGE_COUNT = 6;

export function useMissionResults(userScoringId: string | undefined) {
  const [pinnedItems, setPinnedItems] = useState<MissionMatchItem[]>([]);
  const [firstOtherItems, setFirstOtherItems] = useState<MissionMatchItem[]>([]);
  const [otherItems, setOtherItems] = useState<MissionMatchItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visiblePageNumbers = useMemo(() => {
    const firstVisiblePage = Math.max(1, page - (VISIBLE_PAGE_COUNT - 1));
    return Array.from({ length: VISIBLE_PAGE_COUNT }, (_, i) => firstVisiblePage + i);
  }, [page]);

  useEffect(() => {
    if (!userScoringId) {
      setError("Identifiant de scoring manquant.");
      setPinnedItems([]);
      setFirstOtherItems([]);
      setOtherItems([]);
      setHasNextPage(false);
      setLoading(false);
      return;
    }

    let active = true;

    setLoading(true);
    setError(null);
    setPage(1);
    setPinnedItems([]);
    setFirstOtherItems([]);
    setOtherItems([]);
    setHasNextPage(false);

    // Réutilise le préchargement lancé pendant l'écran de transition si disponible,
    // sinon déclenche le chargement (accès direct à /results/:id).
    prefetchInitialMatches(userScoringId)
      .then(({ pinned, other }) => {
        if (!active) return;
        setPinnedItems(pinned.items);
        setFirstOtherItems(other.items);
        setOtherItems(other.items);
        setHasNextPage(other.items.length === OTHER_RESULTS_PAGE_SIZE);
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

  useEffect(() => {
    if (!userScoringId) {
      return;
    }

    if (page === 1) {
      setOtherItems(firstOtherItems);
      setHasNextPage(firstOtherItems.length === OTHER_RESULTS_PAGE_SIZE);
      setPageLoading(false);
      return;
    }

    let active = true;

    setPageLoading(true);
    setOtherItems([]);
    fetchMatches(userScoringId, OTHER_RESULTS_PAGE_SIZE, PINNED_RESULTS_LIMIT + (page - 1) * OTHER_RESULTS_PAGE_SIZE)
      .then((res) => {
        if (!active) return;
        setOtherItems(res.items);
        setHasNextPage(res.items.length === OTHER_RESULTS_PAGE_SIZE);
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
  }, [firstOtherItems, page, userScoringId]);

  return {
    pinnedItems,
    otherItems,
    page,
    setPage,
    hasNextPage,
    loading,
    pageLoading,
    error,
    visiblePageNumbers,
  };
}
