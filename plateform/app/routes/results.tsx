import { Suspense, lazy, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import MissionCard from "~/components/missions/mission-card";
import MatchingDebugModal, { type MatchingDebugUserValue } from "~/components/results/matching-debug-modal";
import GradientBg from "~/components/ui/gradient-bg";
import { OPTIONS } from "~/config/quiz-options";
import { useMissionResults } from "~/hooks/useMissionResults";
import { useQuizStore } from "~/stores/quiz";
import type { MatchResultItem } from "~/types/matching";
import { matchResultToBrowseMission } from "~/utils/mission";

// Lazy-load the map to avoid SSR issues with Leaflet
const MissionMap = lazy(() => import("~/components/results/mission-map"));

const FRANCE_CENTER: [number, number] = [46.6, 2.3];

export default function ResultsPage() {
  const { userScoringId } = useParams<{ userScoringId: string }>();
  const reset = useQuizStore((s) => s.reset);
  const answers = useQuizStore((s) => s.answers);
  const { pinnedItems, otherItems, page, setPage, hasNextPage, loading, pageLoading, error, visiblePageNumbers } = useMissionResults(userScoringId);
  const [debugItem, setDebugItem] = useState<MatchResultItem | null>(null);

  const locAnswer = answers["localisation"];
  const geo = locAnswer?.type === "params" ? (locAnswer.params as { lat: number; lon: number }) : null;
  const mapCenter: [number, number] = geo ? [geo.lat, geo.lon] : FRANCE_CENTER;
  const userValues = useMemo<MatchingDebugUserValue[]>(
    () =>
      Object.values(answers).flatMap((answer) => {
        if (answer?.type === "options") {
          return answer.option_ids.map((optionId) => ({
            taxonomyKey: answer.taxonomy,
            taxonomyValueKey: optionId,
            taxonomyValueLabel: OPTIONS[`${answer.taxonomy}.${optionId}` as keyof typeof OPTIONS]?.label ?? optionId,
            userScore: 1,
          }));
        }
        if (answer?.type === "params") {
          return [
            {
              taxonomyKey: answer.taxonomy,
              taxonomyValueKey: JSON.stringify(answer.params),
              taxonomyValueLabel: JSON.stringify(answer.params),
              userScore: 1,
            },
          ];
        }
        return [];
      }),
    [answers],
  );

  const renderDebugAction = (item: MatchResultItem) => (
    <button
      type="button"
      className="fr-btn fr-btn--tertiary fr-btn--icon-only absolute bottom-2 left-2 z-10"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDebugItem(item);
      }}
      aria-label={`Débuguer le matching de ${item.mission.title}`}
    >
      <i className="fr-icon-settings-5-line fr-icon--sm" aria-hidden="true" />
    </button>
  );

  return (
    <GradientBg fixed>
      <main>
        <section className="flex flex-col md:flex-row">
          <div className="flex flex-col md:w-7/12">
            <div className="h-72 w-full md:hidden">
              <Suspense fallback={<div className="h-full fr-background-alt--grey" />}>
                {!loading && pinnedItems.length > 0 && <MissionMap items={pinnedItems} center={mapCenter} />}
              </Suspense>
            </div>

            <div className="relative z-[1200] -mt-12 w-full rounded-t-[1.5rem] bg-white pt-7 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] md:mt-0 md:rounded-none md:bg-transparent md:pt-0 md:shadow-none">
              <div className="flex items-center justify-between px-5 pb-2 md:px-6 md:pt-6">
                {!loading && !error && (
                  <h1 className="fr-h3 mb-0!">
                    <span className="text-highlighted">
                      {pinnedItems.length} mission{pinnedItems.length > 1 ? "s" : ""}
                    </span>{" "}
                    pour toi
                  </h1>
                )}

                <Link to="/quiz/age" onClick={() => reset()} className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-arrow-left-line fr-btn--icon-left shrink-0">
                  Changer mes réponses
                </Link>
              </div>

              <div className="px-5 py-4 md:px-6">
                {loading && <p className="text-mention-grey text-sm">Chargement…</p>}

                {error && (
                  <div className="fr-alert fr-alert--error">
                    <p>{error}</p>
                  </div>
                )}

                {!loading && !error && pinnedItems.length === 0 && otherItems.length === 0 && <p className="text-mention-grey text-sm">Aucune mission trouvée pour ce profil.</p>}
              </div>

              {!loading && !error && pinnedItems.length > 0 && (
                <>
                  <div className="grid gap-4 px-5 pb-5 md:grid-cols-2 md:gap-5 md:px-6">
                    {pinnedItems.map((item) => (
                      <MissionCard
                        key={item.mission.id}
                        mission={matchResultToBrowseMission(item)}
                        link={{ type: "internal", to: userScoringId ? `/results/${userScoringId}/missions/${item.mission.id}` : `/missions/${item.mission.id}` }}
                        action={renderDebugAction(item)}
                      />
                    ))}
                  </div>

                  <div className="px-5 pb-8 md:px-6">
                    <button type="button" className="fr-btn fr-btn--secondary fr-icon-mail-line fr-btn--icon-left w-full! justify-center!">
                      Recevoir ces 5 missions par e-mail
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="sticky top-0 hidden h-screen md:block md:w-5/12">
            <Suspense fallback={<div className="h-full fr-background-alt--grey" />}>
              {!loading && pinnedItems.length > 0 && <MissionMap items={pinnedItems} center={mapCenter} />}
            </Suspense>
          </div>
        </section>

        <div className="px-6 pb-10">
          {!loading && !error && (otherItems.length > 0 || page > 1) && (
            <section className="mx-auto max-w-7xl">
              <h2 className="fr-h4 fr-mb-3w">Il y a d'autres missions qui peuvent te plaire</h2>

              {pageLoading ? (
                <p className="text-mention-grey py-8 text-sm">Chargement…</p>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {otherItems.map((item) => (
                    <MissionCard
                      key={item.mission.id}
                      mission={matchResultToBrowseMission(item)}
                      link={{ type: "internal", to: userScoringId ? `/results/${userScoringId}/missions/${item.mission.id}` : `/missions/${item.mission.id}` }}
                      action={renderDebugAction(item)}
                    />
                  ))}
                </div>
              )}

              <nav role="navigation" className="fr-pagination fr-mt-3w" aria-label="Pagination des autres missions">
                <ul className="fr-pagination__list justify-center!">
                  <li>
                    <button
                      type="button"
                      className="fr-pagination__link fr-pagination__link--prev fr-pagination__link--lg-label"
                      disabled={page === 1 || pageLoading}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      Précédent
                    </button>
                  </li>

                  {visiblePageNumbers.map((pageNumber) => (
                    <li key={pageNumber}>
                      <button
                        type="button"
                        className="fr-pagination__link"
                        aria-current={pageNumber === page ? "page" : undefined}
                        aria-label={`Page ${pageNumber}${pageNumber === page ? ", page actuelle" : ""}`}
                        disabled={pageLoading}
                        onClick={() => setPage(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    </li>
                  ))}

                  <li>
                    <button
                      type="button"
                      className="fr-pagination__link fr-pagination__link--next fr-pagination__link--lg-label"
                      disabled={!hasNextPage || pageLoading}
                      onClick={() => setPage((current) => current + 1)}
                    >
                      Suivant
                    </button>
                  </li>
                </ul>
              </nav>
            </section>
          )}
        </div>
      </main>

      <MatchingDebugModal item={debugItem} userValues={userValues} onClose={() => setDebugItem(null)} />
    </GradientBg>
  );
}
