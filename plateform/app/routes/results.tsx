import type { MissionMatchItem } from "@engagement/dto";
import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { FooterContent } from "~/components/layout/footer";
import Newsletter from "~/components/layout/newsletter";
import Partners from "~/components/layout/partners";
import MissionCard from "~/components/missions/mission-card";
import EmailMissionsModal from "~/components/results/email-missions-modal";
import LazyMissionMap from "~/components/results/lazy-mission-map";
import MatchingDebugModal, { type MatchingDebugUserValue } from "~/components/results/matching-debug-modal";
import OtherMissions from "~/components/results/other-missions";
import PinnedMissions from "~/components/results/pinned-missions";
import GradientBg from "~/components/ui/gradient-bg";
import Highlight from "~/components/ui/highlight";
import { QUIZ_FLOW } from "~/config/quiz-flow";
import { OPTIONS } from "~/config/quiz-options";
import { useIsMobile } from "~/hooks/useIsMobile";
import { useMissionResults } from "~/hooks/useMissionResults";
import { useQuizStore } from "~/stores/quiz";
import { evalCondition } from "~/utils/conditions";
import { buildMissionDetailHref, matchResultToBrowseMission } from "~/utils/mission";

const FRANCE_CENTER: [number, number] = [46.6, 2.3];

export default function ResultsPage() {
  const { userScoringId } = useParams<{ userScoringId: string }>();
  const isMobile = useIsMobile();
  const answers = useQuizStore((s) => s.answers);
  const { pinnedItems, otherItems, page, setPage, hasNextPage, loading, pageLoading, error, visiblePageNumbers } = useMissionResults(userScoringId);
  const [expanded, setExpanded] = useState(false);
  const [selectedMission, setSelectedMission] = useState<MissionMatchItem | null>(null);
  const [isClosingCard, setIsClosingCard] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
  const showOther = !loading && !error && (otherItems.length > 0 || page > 1);

  // Dernier step visible du quiz selon les réponses courantes → "Changer mes réponses" y renvoie.
  const lastQuizStep = QUIZ_FLOW.filter((s) => !s.condition || evalCondition(s.condition, answers)).at(-1);
  const changeAnswersHref = lastQuizStep?.route ?? "/quiz/age";

  const handleToggleSheet = () => {
    if (expanded && scrollRef.current) scrollRef.current.scrollTop = 0;
    setExpanded((v) => !v);
  };

  const handleCollapseSheet = () => {
    if (selectedMission) setIsClosingCard(true);
    if (!expanded) return;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setExpanded(false);
  };

  const handleMarkerClick = (item: MissionMatchItem) => {
    setIsClosingCard(false);
    setSelectedMission(item);
    if (expanded) {
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
      setExpanded(false);
    }
  };

  if (isMobile) {
    return (
      <main>
        <section className="relative h-[calc(100dvh-3.5rem)] overflow-hidden">
          {showMap && (
            <div className="absolute inset-0 z-0" onClickCapture={handleCollapseSheet}>
              <LazyMissionMap items={pinnedItems} center={mapCenter} onMarkerClick={handleMarkerClick} />
            </div>
          )}

          {selectedMission && !expanded && (
            <div
              key={selectedMission.mission.id}
              className={`absolute inset-x-3 bottom-3 z-[500] ${isClosingCard ? "animate-slide-down-fade" : "animate-slide-up-fade"}`}
              onAnimationEnd={() => {
                if (!isClosingCard) return;
                setSelectedMission(null);
                setIsClosingCard(false);
              }}
            >
              <div className="relative">
                <MissionCard mission={matchResultToBrowseMission(selectedMission)} link={{ type: "internal", to: buildMissionDetailHref(selectedMission, userScoringId) }} />
                <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-background! shadow-md"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setEmailModalOpen(true);
                    }}
                    aria-label="Recevoir par email"
                  >
                    <i className="fr-icon-mail-send-line fr-icon--sm" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-background! shadow-md"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsClosingCard(true);
                    }}
                    aria-label="Fermer la carte"
                  >
                    <i className="fr-icon-close-line fr-icon--sm" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div
            className={`absolute inset-x-0 bottom-0 z-[1000] flex flex-col rounded-t-3xl bg-white shadow-2xl transition-[top] duration-300 ${expanded ? "top-12" : "top-[calc(100%-5rem)]"} ${selectedMission ? "hidden" : ""}`}
          >
            <div className={`flex flex-col gap-2 px-6 py-4 ${expanded ? "items-start!" : "items-center! justify-center! h-full"}`} onClick={handleToggleSheet}>
              {!loading && error && <p className="fr-error-text m-0! text-center!">{error}</p>}
              {!loading && !error && (
                <h2 className={`m-0! ${expanded ? "text-center!" : ""}`}>
                  <Highlight>
                    <span className="text-blue-france-sun">
                      {pinnedItems.length} mission{pinnedItems.length > 1 ? "s" : ""}
                    </span>
                  </Highlight>
                  pour toi
                </h2>
              )}

              {expanded && (
                <Link to={changeAnswersHref} className="fr-link fr-link--sm shrink-0">
                  <span className="fr-icon-arrow-left-line fr-btn--icon-left" aria-hidden="true" />
                  Changer mes réponses
                </Link>
              )}
            </div>

            <div ref={scrollRef} className={`flex-1 overflow-y-auto overscroll-contain ${expanded ? "" : "hidden"}`}>
              <PinnedMissions items={pinnedItems} loading={loading} error={error} userScoringId={userScoringId} />

              {showOther && (
                <div className="px-6 pt-2 pb-8">
                  <OtherMissions
                    items={otherItems}
                    page={page}
                    hasNextPage={hasNextPage}
                    pageLoading={pageLoading}
                    visiblePageNumbers={visiblePageNumbers}
                    userScoringId={userScoringId}
                    onPageChange={setPage}
                  />
                </div>
              )}

              <Newsletter
                title="Reçois tes missions par email"
                subtitle="1 email par mois avec les missions qui pourraient t'intéresser."
                ctaText="Recevoir mes missions"
                hintText="En renseignant ton adresse électronique, tu acceptes de recevoir de nouvelles offres de missions. Tu pourras te désinscrire à tout moment."
              />
              <Partners style="compact" />
              <FooterContent />
            </div>
          </div>
        </section>

        <MatchingDebugModal items={[...pinnedItems, ...otherItems]} userValues={userValues} />
        <EmailMissionsModal userScoringId={userScoringId} open={emailModalOpen} onOpenChange={setEmailModalOpen} hideTrigger />
      </main>
    );
  }

  return (
    <>
      <main>
        <GradientBg fixed className="px-12">
          <section className="flex flex-row max-w-7xl mx-auto">
            <div className="flex flex-col flex-1 py-12">
              <div className="flex gap-2 mb-6 flex-row items-center justify-between gap-4 px-6" onClick={handleToggleSheet}>
                {!loading && !error && (
                  <h2 className="m-0!">
                    <Highlight>
                      <span className="text-blue-france-sun">
                        {pinnedItems.length} mission{pinnedItems.length > 1 ? "s" : ""}
                      </span>
                    </Highlight>
                    pour toi
                  </h2>
                )}

                <Link to={changeAnswersHref} className="fr-link fr-link--sm shrink-0">
                  Changer mes réponses
                </Link>
              </div>
              <PinnedMissions items={pinnedItems} loading={loading} error={error} userScoringId={userScoringId} />
            </div>
            <div className="sticky top-0 max-h-[720px] flex-1 py-12">{showMap && <LazyMissionMap items={pinnedItems} center={mapCenter} />}</div>
          </section>
          <MatchingDebugModal items={[...pinnedItems, ...otherItems]} userValues={userValues} />
        </GradientBg>

        {showOther && (
          <section className="mx-auto max-w-7xl py-10">
            <OtherMissions
              items={otherItems}
              page={page}
              hasNextPage={hasNextPage}
              pageLoading={pageLoading}
              visiblePageNumbers={visiblePageNumbers}
              userScoringId={userScoringId}
              gridClassName="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mx-auto"
              onPageChange={setPage}
            />
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
