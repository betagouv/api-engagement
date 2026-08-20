import type { MissionMatchItem } from "@engagement/dto";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { FooterContent } from "~/components/layout/footer";
import Newsletter from "~/components/layout/newsletter";
import Partners from "~/components/layout/partners";
import MatchMissionCard from "~/components/missions/match-mission-card";
import EmailMissionsModal from "~/components/results/email-missions-modal";
import LazyMissionMap from "~/components/results/lazy-mission-map";
import MatchingDebugModal, { type MatchingDebugUserValue } from "~/components/results/matching-debug-modal";
import ProfileModal from "~/components/results/profile-modal";
import ResultsFilters from "~/components/results/results-filters";
import ResultsMissions from "~/components/results/results-missions";
import GradientBg from "~/components/ui/gradient-bg";
import Highlight from "~/components/ui/highlight";
import { QUIZ_FLOW } from "~/config/quiz-flow";
import { OPTIONS } from "~/config/quiz-options";
import { useIsMobile } from "~/hooks/useIsMobile";
import { RESULTS_PAGE_SIZE, useMissionResults } from "~/hooks/useMissionResults";
import { setQuizSessionId } from "~/services/tracking";
import { trackResultsViewed } from "~/services/tracking/events";
import { useQuizStore } from "~/stores/quiz";
import { evalCondition } from "~/utils/conditions";
import type { Route } from "./+types/results";

export function meta(): Route.MetaDescriptors {
  return [{ title: "Tes missions recommandées — Trouve ta mission" }];
}

export async function clientLoader() {
  return { backHref: null };
}

const FRANCE_CENTER: [number, number] = [46.6, 2.3];

export default function ResultsPage() {
  const { userScoringId } = useParams<{ userScoringId: string }>();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const answers = useQuizStore((s) => s.answers);
  const { items, page, setPage, totalPages, totalResults, avgDistanceKmTop5, loading, pageLoading, error, refresh } = useMissionResults(userScoringId);
  const resultsViewedFired = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedMission, setSelectedMission] = useState<MissionMatchItem | null>(null);
  const [hoveredMissionId, setHoveredMissionId] = useState<string | null>(null);
  const [isClosingCard, setIsClosingCard] = useState(false);
  // Mission dont l'utilisateur veut recevoir la fiche par email (bouton email d'une carte) : ouvre la modale en mode mission unique.
  const [emailMissionId, setEmailMissionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Carrousel mobile de cartes mission affiché au clic sur un pin.
  const carouselRef = useRef<HTMLDivElement>(null);
  const carouselScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // quiz_session_id vient de l'URL ici (accès direct possible) : on l'enregistre comme super
  // property pour qu'il soit attaché à results.viewed et aux mission.clicked de cette page.
  useEffect(() => {
    if (userScoringId) setQuizSessionId(userScoringId);
  }, [userScoringId]);

  // RGAA 12.7 : le lien d'évitement « Pied de page » cible #footer, rendu ici dans le
  // panneau dépliable (masqué quand il est replié). Quand la cible est activée, on déplie
  // le panneau et on place le focus sur le footer pour qu'il soit réellement atteignable.
  useEffect(() => {
    if (!isMobile) return;
    const revealFooter = () => {
      if (window.location.hash !== "#footer") return;
      setExpanded(true);
      // Laisser React retirer `hidden` du conteneur de défilement avant de déplacer le focus.
      setTimeout(() => document.getElementById("footer")?.focus(), 0);
    };
    revealFooter();
    window.addEventListener("hashchange", revealFooter);
    return () => window.removeEventListener("hashchange", revealFooter);
  }, [isMobile]);

  // RGAA 10.13 : le contenu additionnel affiché au survol (carte mission sur la map) doit pouvoir
  // être masqué à la touche Échap.
  useEffect(() => {
    const clearHoverOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHoveredMissionId(null);
    };
    document.addEventListener("keydown", clearHoverOnEscape);
    return () => document.removeEventListener("keydown", clearHoverOnEscape);
  }, []);

  // Mobile : cale le carrousel sur la carte de la mission cliquée (ouverture ou clic sur un autre pin).
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel || !selectedMission) return;
    const card = carousel.children[items.findIndex((i) => i.mission.id === selectedMission.mission.id)] as HTMLElement | undefined;
    // offsetLeft inclut le padding horizontal du carrousel (px-6 = 24px).
    if (card) carousel.scrollLeft = card.offsetLeft - 24;
  }, [selectedMission, items]);

  // results.viewed : une fois le chargement terminé (succès), on émet l'évènement une seule fois.
  useEffect(() => {
    if (loading || error || resultsViewedFired.current) return;
    resultsViewedFired.current = true;
    trackResultsViewed({
      pinnedCount: items.length,
      totalResultsCount: totalResults,
      avgDistanceKmTop5,
    });
  }, [loading, error, items.length, totalResults, avgDistanceKmTop5]);

  const locAnswer = answers["localisation"];
  const geo = locAnswer?.type === "params" ? (locAnswer.params as { lat: number; lon: number }) : null;
  // Mémoïsé pour garder une identité stable : sinon chaque rendu (ex. sélection d'un pin) recale la carte sur l'ensemble des pins.
  const mapCenter = useMemo<[number, number]>(() => (geo ? [geo.lat, geo.lon] : FRANCE_CENTER), [geo]);
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

  const showMap = !loading && items.length > 0;
  const showDebug = searchParams.get("debug") === "true";

  // Mission mise en avant (survol prioritaire sur sélection) : pin coloré + carte surlignée dans la liste.
  const activeMissionId = hoveredMissionId ?? selectedMission?.mission.id ?? null;

  // Dernier step visible du quiz selon les réponses courantes → "Changer mes réponses" y renvoie.
  const lastQuizStep = QUIZ_FLOW.filter((s) => !s.condition || evalCondition(s.condition, answers)).at(-1);
  const changeAnswersHref = lastQuizStep?.route ?? "/quiz/age";

  // Carte mission affichée sur la map (desktop) : le survol d'un pin prévisualise la mission, le clic
  // la fixe (boutons email + fermer). Survoler un autre pin prévisualise par-dessus la carte fixée.
  const hoveredMission = items.find((i) => i.mission.id === hoveredMissionId) ?? null;
  const displayedMission = hoveredMission ?? selectedMission;
  const displayedMissionRank = displayedMission ? (page - 1) * RESULTS_PAGE_SIZE + items.findIndex((i) => i.mission.id === displayedMission.mission.id) + 1 : 0;
  const cardIsFixed = displayedMission !== null && displayedMission.mission.id === selectedMission?.mission.id;

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

  // Changement de page : la liste du panneau mobile repart en haut.
  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  // Mobile : après un swipe du carrousel, sélectionne la mission de la carte visible (pin mis en avant).
  const handleCarouselScroll = () => {
    if (carouselScrollTimer.current) clearTimeout(carouselScrollTimer.current);
    carouselScrollTimer.current = setTimeout(() => {
      const carousel = carouselRef.current;
      const firstCard = carousel?.children[0] as HTMLElement | undefined;
      if (!carousel || !firstCard) return;
      // Largeur d'une carte + gap de 12px (gap-3) → index de la carte alignée par le snap.
      const index = Math.round(carousel.scrollLeft / (firstCard.offsetWidth + 12));
      const item = items[Math.max(0, Math.min(items.length - 1, index))];
      if (item && item.mission.id !== selectedMission?.mission.id) setSelectedMission(item);
    }, 150);
  };

  if (isMobile) {
    return (
      <main id="contenu" tabIndex={-1} className="flex-1 relative overflow-hidden">
        {showMap && (
          <div className="absolute inset-0 z-0" onClickCapture={handleCollapseSheet}>
            <LazyMissionMap items={items} center={mapCenter} onMarkerClick={handleMarkerClick} activeMissionId={activeMissionId} />
          </div>
        )}

        {selectedMission && !expanded && (
          <div
            className={`absolute inset-x-0 bottom-3 z-[500] ${isClosingCard ? "animate-slide-down-fade" : "animate-slide-up-fade"}`}
            onAnimationEnd={() => {
              if (!isClosingCard) return;
              setSelectedMission(null);
              setIsClosingCard(false);
            }}
          >
            {/* Carrousel : carte de la mission cliquée, swipe horizontal pour parcourir les autres. Fermeture en tapant la map. */}
            <div
              ref={carouselRef}
              onScroll={handleCarouselScroll}
              className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {items.map((item, index) => (
                <div key={item.mission.id} className="w-full shrink-0 snap-center">
                  <MatchMissionCard item={item} section="pinned" rank={(page - 1) * RESULTS_PAGE_SIZE + index + 1} userScoringId={userScoringId} onEmailClick={setEmailMissionId} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          className={`absolute inset-x-0 bottom-0 z-[1000] flex flex-col rounded-t-3xl bg-background shadow-2xl transition-[top] duration-300 ${expanded ? "top-12" : "top-[calc(100%-6rem)]"} ${selectedMission ? "hidden" : ""}`}
        >
          <div className={`flex flex-col gap-2 p-6 items-center! justify-center! ${!expanded ? "h-full" : ""}`} onClick={handleToggleSheet}>
            {!loading && error && (
              <p role="alert" className="fr-error-text m-0! text-center!">
                {error}
              </p>
            )}
            {!loading && !error && (
              <h1 className="fr-h5 m-0! text-center!">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls="results-sheet-content"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleSheet();
                  }}
                >
                  Découvre <Highlight>les missions</Highlight>
                  <br /> qui te correspondent le mieux
                </button>
              </h1>
            )}

            {expanded && (
              <Link to={changeAnswersHref} className="fr-link fr-link--sm shrink-0">
                <span className="fr-icon-arrow-left-line fr-btn--icon-left" aria-hidden="true" />
                Changer mes réponses
              </Link>
            )}
          </div>

          <div ref={scrollRef} id="results-sheet-content" className={`flex-1 overflow-y-auto overscroll-contain ${expanded ? "" : "hidden"}`}>
            <ResultsMissions
              items={items}
              page={page}
              totalPages={totalPages}
              loading={loading}
              pageLoading={pageLoading}
              error={error}
              userScoringId={userScoringId}
              showDebug={showDebug}
              highlightedMissionId={activeMissionId}
              onEmailClick={setEmailMissionId}
              onPageChange={handlePageChange}
            />

            <Newsletter
              title="Reçois tes missions par email"
              subtitle="1 email par mois avec les missions qui pourraient t'intéresser."
              ctaText="Recevoir mes missions"
              hintText="En renseignant ton adresse électronique, tu acceptes de recevoir de nouvelles offres de missions. Tu pourras te désinscrire à tout moment."
            />
            <Partners style="compact" />
            <FooterContent landmark={false} />
          </div>
        </div>

        <MatchingDebugModal items={items} userValues={userValues} />
        <EmailMissionsModal
          userScoringId={userScoringId}
          missionId={emailMissionId ?? undefined}
          open={emailMissionId !== null}
          onOpenChange={(open) => {
            if (!open) setEmailMissionId(null);
          }}
          hideTrigger
        />
      </main>
    );
  }

  return (
    <>
      <main id="contenu" tabIndex={-1}>
        {!error && <ResultsFilters userScoringId={userScoringId} onResultsChange={refresh} />}
        <GradientBg fixed className="px-12">
          <section className="max-w-7xl mx-auto py-12">
            <div className="flex mb-6 flex-row items-center justify-between gap-4 pl-6">
              {/* RGAA 9.1 : en état d'erreur le h1 est rendu dans l'alerte de ResultsMissions. */}
              {!error && <h1 className="fr-h3 m-0!">Découvre les missions qui te correspondent le mieux</h1>}

              <ProfileModal quizHref={changeAnswersHref} />
            </div>
            <div className="flex flex-row">
              <div className="flex flex-col flex-1">
                <ResultsMissions
                  items={items}
                  page={page}
                  totalPages={totalPages}
                  loading={loading}
                  pageLoading={pageLoading}
                  error={error}
                  userScoringId={userScoringId}
                  showDebug={showDebug}
                  highlightedMissionId={activeMissionId}
                  onMissionHover={setHoveredMissionId}
                  onEmailClick={setEmailMissionId}
                  onPageChange={setPage}
                />
              </div>
              <div className="sticky top-6 max-h-[624px] flex-1">
                {showMap && (
                  <div className="relative h-full overflow-hidden rounded-lg">
                    <LazyMissionMap
                      items={items}
                      center={mapCenter}
                      onMarkerClick={handleMarkerClick}
                      selectionPadding={[360, 0]}
                      activeMissionId={activeMissionId}
                      onMissionHover={setHoveredMissionId}
                    />

                    {displayedMission && (
                      <div className={`absolute top-4 left-4 z-[500] w-[290px] ${cardIsFixed ? "" : "pointer-events-none"}`}>
                        <div className="relative">
                          <MatchMissionCard item={displayedMission} section="pinned" rank={displayedMissionRank} userScoringId={userScoringId} />
                          {cardIsFixed && (
                            <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
                              <button
                                type="button"
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-background! shadow-md"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEmailMissionId(displayedMission.mission.id);
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
                                  setSelectedMission(null);
                                }}
                                aria-label="Fermer la carte"
                              >
                                <i className="fr-icon-close-line fr-icon--sm" aria-hidden="true" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
          <MatchingDebugModal items={items} userValues={userValues} />
        </GradientBg>

        <Newsletter
          title="Reçois tes missions par email"
          subtitle="1 email par mois avec les missions qui pourraient t'intéresser."
          ctaText="Recevoir mes missions"
          hintText="En renseignant ton adresse électronique, tu acceptes de recevoir de nouvelles offres de missions. Tu pourras te désinscrire à tout moment."
        />
        <Partners style="compact" />
      </main>
      <EmailMissionsModal
        userScoringId={userScoringId}
        missionId={emailMissionId ?? undefined}
        open={emailMissionId !== null}
        onOpenChange={(open) => {
          if (!open) setEmailMissionId(null);
        }}
        hideTrigger
      />
    </>
  );
}
