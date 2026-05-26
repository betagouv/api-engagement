import LazyMissionMap from "~/components/results/lazy-mission-map";
import MatchingDebugModal, { type MatchingDebugUserValue } from "~/components/results/matching-debug-modal";
import OtherMissions from "~/components/results/other-missions";
import PinnedMissions from "~/components/results/pinned-missions";
import GradientBg from "~/components/ui/gradient-bg";
import { OPTIONS } from "~/config/quiz-options";
import { useMissionResults } from "~/hooks/useMissionResults";
import { useQuizStore } from "~/stores/quiz";
import type { MissionMatchItem } from "@engagement/dto";
import { useMemo, useState } from "react";
import { useParams } from "react-router";

const FRANCE_CENTER: [number, number] = [46.6, 2.3];

export default function ResultsPage() {
  const { userScoringId } = useParams<{ userScoringId: string }>();
  const reset = useQuizStore((s) => s.reset);
  const answers = useQuizStore((s) => s.answers);
  const { pinnedItems, otherItems, page, setPage, hasNextPage, loading, pageLoading, error, visiblePageNumbers } = useMissionResults(userScoringId);
  const [debugItem, setDebugItem] = useState<MissionMatchItem | null>(null);

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

  const renderDebugAction = (item: MissionMatchItem) => (
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

  const showMap = !loading && pinnedItems.length > 0;

  return (
    <GradientBg fixed>
      <main>
        <section className="flex flex-col md:flex-row">
          <div className="flex flex-col md:w-7/12">
            <div className="h-72 w-full md:hidden">{showMap && <LazyMissionMap items={pinnedItems} center={mapCenter} />}</div>

            <PinnedMissions items={pinnedItems} loading={loading} error={error} userScoringId={userScoringId} onResetAnswers={reset} renderAction={renderDebugAction} />
          </div>

          <div className="sticky top-0 hidden h-screen md:block md:w-5/12">{showMap && <LazyMissionMap items={pinnedItems} center={mapCenter} />}</div>
        </section>

        {!loading && !error && (otherItems.length > 0 || page > 1) && (
          <OtherMissions
            items={otherItems}
            page={page}
            pageLoading={pageLoading}
            hasNextPage={hasNextPage}
            pageItems={visiblePageNumbers}
            userScoringId={userScoringId}
            onPageChange={setPage}
            renderAction={renderDebugAction}
          />
        )}
      </main>

      <MatchingDebugModal item={debugItem} userValues={userValues} onClose={() => setDebugItem(null)} />
    </GradientBg>
  );
}
