import { Suspense, lazy, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import MatchingDebugModal, { type MatchingDebugUserValue } from "~/components/results/MatchingDebugModal";
import MissionCard from "~/components/results/MissionCard";
import { OPTIONS } from "~/config/quiz-options";
import { OTHER_RESULTS_PAGE_SIZE, PINNED_RESULTS_LIMIT, useMissionResults } from "~/hooks/useMissionResults";
import { useQuizStore } from "~/stores/quiz";
import type { MatchResultItem } from "~/types/matching";

// Lazy-load the map to avoid SSR issues with Leaflet
const MissionMap = lazy(() => import("~/components/results/MissionMap"));

const FRANCE_CENTER: [number, number] = [46.6, 2.3];

export default function ResultsPage() {
  const { userScoringId } = useParams<{ userScoringId: string }>();
  const reset = useQuizStore((s) => s.reset);
  const answers = useQuizStore((s) => s.answers);
  const geo = useQuizStore((s) => s.geo);
  const { pinnedItems, otherItems, page, setPage, hasNextPage, loading, pageLoading, error, visiblePageNumbers } = useMissionResults(userScoringId);
  const [debugItem, setDebugItem] = useState<MatchResultItem | null>(null);

  const mapCenter: [number, number] = geo ? [geo.lat, geo.lon] : FRANCE_CENTER;
  const userValues = useMemo<MatchingDebugUserValue[]>(
    () =>
      Object.values(answers).flatMap((answer) => {
        if (answer?.type !== "options") {
          return [];
        }

        return answer.option_ids.map((optionId) => {
          const [taxonomyKey, taxonomyValueKey] = optionId.split(".", 2);
          return {
            taxonomyKey: taxonomyKey ?? "unknown",
            taxonomyValueKey: taxonomyValueKey ?? optionId,
            taxonomyValueLabel: OPTIONS[optionId as keyof typeof OPTIONS]?.label ?? optionId,
            userScore: 1,
          };
        });
      }),
    [answers],
  );

  return (
    <div className="results-page min-h-screen bg-[#f6f6f6] md:bg-white">
      <section className="flex flex-col md:flex-row">
        <div className="flex flex-col md:w-7/12">
          <div className="h-72 w-full md:hidden">
            <Suspense fallback={<div className="h-full bg-gray-100" />}>{!loading && pinnedItems.length > 0 && <MissionMap items={pinnedItems} center={mapCenter} />}</Suspense>
          </div>

          <div className="results-mobile-panel results-surface relative -mt-12 w-full rounded-t-[1.5rem] pt-7 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] md:mt-0 md:rounded-none md:pt-0 md:shadow-none">
            <div className="px-5 pb-2 md:px-6 md:pt-6">
              {!loading && !error && (
                <h1 className="text-2xl font-bold">
                  <span className="results-title-accent">
                    {pinnedItems.length} mission{pinnedItems.length > 1 ? "s" : ""}
                  </span>{" "}
                  pour toi
                </h1>
              )}

              <Link to="/quiz/age" onClick={() => reset()} className="results-link mt-1 inline-flex items-center gap-1 text-sm hover:underline md:mt-3">
                <i className="fr-icon-arrow-left-line fr-icon--sm" aria-hidden="true" />
                Changer mes réponses
              </Link>
            </div>

            <div className="px-5 py-4 md:px-6">
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
                <div className="grid gap-4 px-5 pb-5 md:grid-cols-2 md:gap-5 md:px-6">
                  {pinnedItems.map((item, i) => (
                    <MissionCard key={item.mission.id} item={item} index={i} onDebugClick={setDebugItem} />
                  ))}
                </div>

                <div className="px-5 pb-8 md:px-6">
                  <button type="button" className="w-full border border-[#000091] px-4 py-3 text-sm font-semibold text-[#000091] hover:bg-[#f5f5ff]">
                    <i className="fr-icon-mail-line fr-icon--sm mr-2" aria-hidden="true" />
                    Recevoir ces 5 missions par e-mail
                  </button>
                </div>
              </>
            )}
          </div>
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
                  <MissionCard key={item.mission.id} item={item} index={PINNED_RESULTS_LIMIT + (page - 1) * OTHER_RESULTS_PAGE_SIZE + i} onDebugClick={setDebugItem} />
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

      <MatchingDebugModal item={debugItem} userValues={userValues} onClose={() => setDebugItem(null)} />
    </div>
  );
}
