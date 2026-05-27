import { useMemo } from "react";
import { useParams } from "react-router";
import Newsletter from "~/components/layout/newsletter";
import Partners from "~/components/layout/partners";
import MissionCard from "~/components/missions/mission-card";
import LazyMissionMap from "~/components/results/lazy-mission-map";
import MatchingDebugModal, { DebugButton, type MatchingDebugUserValue } from "~/components/results/matching-debug-modal";
import PinnedMissions from "~/components/results/pinned-missions";
import GradientBg from "~/components/ui/gradient-bg";
import Pagination from "~/components/ui/pagination";
import { OPTIONS } from "~/config/quiz-options";
import { useMissionResults } from "~/hooks/useMissionResults";
import { useQuizStore } from "~/stores/quiz";
import { matchResultToBrowseMission } from "~/utils/mission";

const FRANCE_CENTER: [number, number] = [46.6, 2.3];

export default function ResultsPage() {
  const { userScoringId } = useParams<{ userScoringId: string }>();
  const reset = useQuizStore((s) => s.reset);
  const answers = useQuizStore((s) => s.answers);
  const { pinnedItems, otherItems, page, setPage, hasNextPage, loading, pageLoading, error, visiblePageNumbers } = useMissionResults(userScoringId);

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

  const showMap = !loading && pinnedItems.length > 0;

  return (
    <>
      <main>
        <GradientBg fixed className="px-12">
          <section className="flex flex-col md:flex-row">
            <div className="flex flex-col md:flex-1 py-12">
              {/* <div className="h-72 w-full md:hidden">{showMap && <LazyMissionMap items={pinnedItems} center={mapCenter} />}</div> */}

              <PinnedMissions items={pinnedItems} loading={loading} error={error} userScoringId={userScoringId} onResetAnswers={reset} />
            </div>

            <div className="sticky top-0 hidden max-h-[620px] md:block md:flex-1 py-12">{showMap && <LazyMissionMap items={pinnedItems} center={mapCenter} />}</div>
          </section>

          <MatchingDebugModal items={[...pinnedItems, ...otherItems]} userValues={userValues} />
        </GradientBg>

        {!loading && !error && (otherItems.length > 0 || page > 1) && (
          <section className="mx-auto max-w-7xl py-10">
            <h2>Il y a d'autres missions qui peuvent te plaire</h2>

            {pageLoading ? (
              <p className="text-mention-grey py-8 text-sm">Chargement…</p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mx-auto">
                {otherItems.map((item) => (
                  <div key={item.mission.id} className="relative">
                    <MissionCard
                      mission={matchResultToBrowseMission(item)}
                      link={{ type: "internal", to: userScoringId ? `/results/${userScoringId}/missions/${item.mission.id}` : `/missions/${item.mission.id}` }}
                    />
                    <DebugButton missionId={item.mission.id} />
                  </div>
                ))}
              </div>
            )}

            <div className="fr-mt-3w">
              <Pagination
                page={page}
                totalPages={Math.max(page, ...visiblePageNumbers)}
                pageItems={visiblePageNumbers}
                hasNextPage={hasNextPage}
                disabled={pageLoading}
                ariaLabel="Pagination des autres missions"
                onPageChange={setPage}
              />
            </div>
          </section>
        )}
      </main>
      <Newsletter
        title="Reçois tes missions par email"
        subtitle="1 email par mois avec les missions qui pourraient t'intéresser."
        ctaText="Recevoir mes missions"
        hintText="En renseignant ton adresse électronique, tu acceptes de recevoir de nouvelles offres de missions. Tu pourras te désinscrire à tout moment."
      />
      <Partners style="compact" />
    </>
  );
}
