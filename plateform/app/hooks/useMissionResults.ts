import { useEffect, useMemo, useState } from "react";
import { fetchMatches } from "~/services/matching";
import type { MatchResultItem } from "~/types/matching";

export const PINNED_RESULTS_LIMIT = 5;
export const OTHER_RESULTS_PAGE_SIZE = 8;
export const VISIBLE_PAGE_COUNT = 6;

export function useMissionResults(userScoringId: string | undefined) {
  const [pinnedItems, setPinnedItems] = useState<MatchResultItem[]>([]);
  const [firstOtherItems, setFirstOtherItems] = useState<MatchResultItem[]>([]);
  const [otherItems, setOtherItems] = useState<MatchResultItem[]>([]);
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

    Promise.all([fetchMatches(userScoringId, PINNED_RESULTS_LIMIT), fetchMatches(userScoringId, OTHER_RESULTS_PAGE_SIZE, PINNED_RESULTS_LIMIT)])
      .then(([pinnedRes, otherRes]) => {
        if (!active) return;
        setPinnedItems(pinnedRes.items);
        setFirstOtherItems(otherRes.items);
        setOtherItems(otherRes.items);
        setHasNextPage(otherRes.items.length === OTHER_RESULTS_PAGE_SIZE);
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
