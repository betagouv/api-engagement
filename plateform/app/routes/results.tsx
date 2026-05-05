import { Suspense, lazy, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import MissionCard from "~/components/results/MissionCard";
import { fetchMatches } from "~/services/matching";
import { useQuizStore } from "~/stores/quiz";
import type { MatchResultItem } from "~/types/matching";

// Lazy-load the map to avoid SSR issues with Leaflet
const MissionMap = lazy(() => import("~/components/results/MissionMap"));

const FRANCE_CENTER: [number, number] = [46.6, 2.3];
const PINNED_RESULTS_LIMIT = 5;
const OTHER_RESULTS_PAGE_SIZE = 8;

export default function ResultsPage() {
  const { userScoringId } = useParams<{ userScoringId: string }>();
  const reset = useQuizStore((s) => s.reset);
  const geo = useQuizStore((s) => s.geo);
  const [pinnedItems, setPinnedItems] = useState<MatchResultItem[]>([]);
  const [otherItems, setOtherItems] = useState<MatchResultItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapCenter: [number, number] = geo ? [geo.lat, geo.lon] : FRANCE_CENTER;
  const firstVisiblePage = Math.max(1, page - 5);
  const visiblePageNumbers = Array.from({ length: 6 }, (_, i) => firstVisiblePage + i);

  useEffect(() => {
    if (!userScoringId) {
      setError("Identifiant de scoring manquant.");
      setPinnedItems([]);
      setOtherItems([]);
      setLoading(false);
      return;
    }

    let active = true;

    setLoading(true);
    setError(null);
    setPage(1);
    setPinnedItems([]);
    setOtherItems([]);
    setHasNextPage(false);

    Promise.all([fetchMatches(userScoringId, PINNED_RESULTS_LIMIT), fetchMatches(userScoringId, OTHER_RESULTS_PAGE_SIZE, PINNED_RESULTS_LIMIT)])
      .then(([pinnedRes, otherRes]) => {
        if (!active) return;
        setPinnedItems(pinnedRes.items);
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
    if (!userScoringId || page === 1) {
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
  }, [page, userScoringId]);

  return (
    <div className="min-h-screen">
      <section className="flex flex-col md:flex-row">
        <div className="flex flex-col md:w-7/12">
          <div className="h-64 w-full md:hidden">
            <Suspense fallback={<div className="h-full bg-gray-100" />}>{!loading && pinnedItems.length > 0 && <MissionMap items={pinnedItems} center={mapCenter} />}</Suspense>
          </div>

          <div className="px-6 pb-2 pt-6">
            <Link to="/quiz/age" onClick={() => reset()} className="mb-3 inline-flex items-center gap-1 text-sm text-[#000091] hover:underline">
              <i className="fr-icon-arrow-left-line fr-icon--sm" aria-hidden="true" />
              Changer mes réponses
            </Link>

            {!loading && !error && (
              <h1 className="text-2xl font-bold">
                <span className="text-[#000091]">
                  {pinnedItems.length} mission{pinnedItems.length > 1 ? "s" : ""}
                </span>{" "}
                pour toi
              </h1>
            )}
          </div>

          <div className="px-6 py-4">
            {loading && <p className="text-sm text-gray-500">Chargement…</p>}

            {error && (
              <div className="fr-alert fr-alert--error">
                <p>{error}</p>
              </div>
            )}

            {!loading && !error && pinnedItems.length === 0 && otherItems.length === 0 && <p className="text-sm text-gray-500">Aucune mission trouvée pour ce profil.</p>}
          </div>

          {!loading && !error && pinnedItems.length > 0 && (
            <>
              <div className="grid gap-5 px-6 pb-5 md:grid-cols-2">
                {pinnedItems.map((item, i) => (
                  <MissionCard key={item.mission.id} item={item} index={i} />
                ))}
              </div>

              <div className="px-6 pb-8">
                <button type="button" className="w-full border border-[#000091] px-4 py-3 text-sm font-semibold text-[#000091] hover:bg-[#f5f5ff]">
                  <i className="fr-icon-mail-line fr-icon--sm mr-2" aria-hidden="true" />
                  Recevoir ces 5 missions par e-mail
                </button>
              </div>
            </>
          )}
        </div>

        <div className="sticky top-0 hidden h-screen md:block md:w-5/12">
          <Suspense fallback={<div className="h-full bg-gray-100" />}>{!loading && pinnedItems.length > 0 && <MissionMap items={pinnedItems} center={mapCenter} />}</Suspense>
        </div>
      </section>

      <div className="px-6 pb-10">
        {!loading && !error && (otherItems.length > 0 || page > 1) && (
          <section className="mx-auto max-w-7xl">
            <h2 className="mb-5 text-2xl font-bold">Il y a d’autres missions qui peuvent te plaire</h2>

            {pageLoading ? (
              <p className="py-8 text-sm text-gray-500">Chargement…</p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {otherItems.map((item, i) => (
                  <MissionCard key={item.mission.id} item={item} index={PINNED_RESULTS_LIMIT + (page - 1) * OTHER_RESULTS_PAGE_SIZE + i} />
                ))}
              </div>
            )}

            <nav className="mt-8 flex items-center justify-center gap-2 text-sm" aria-label="Pagination des autres missions">
              <button
                type="button"
                className="px-3 py-2 text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={page === 1 || pageLoading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Précédent
              </button>

              {visiblePageNumbers.map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  className={`h-9 w-9 ${pageNumber === page ? "bg-[#000091] text-white" : "text-gray-700 hover:bg-gray-100"}`}
                  disabled={pageLoading}
                  onClick={() => setPage(pageNumber)}
                  aria-current={pageNumber === page ? "page" : undefined}
                >
                  {pageNumber}
                </button>
              ))}

              <button
                type="button"
                className="px-3 py-2 text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!hasNextPage || pageLoading}
                onClick={() => setPage((current) => current + 1)}
              >
                Suivant
              </button>
            </nav>
          </section>
        )}
      </div>
    </div>
  );
}
