import type { MissionBrowse, MissionDetailResponse } from "@engagement/dto";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router";
import type { Route } from "./+types/mission-detail";

export function meta({ params }: Route.MetaArgs): Route.MetaDescriptors {
  // noindex : pas de canonical, et pathname sans identifiant de scoring pour ne pas l'exposer.
  return pageMeta({ pathname: `/missions/${params.missionId}` }, { title: "Détail de la mission | Trouve ta mission", robots: "noindex, follow" });
}

export async function clientLoader() {
  return null;
}

import Missions from "~/components/landings/missions";
import BetaBanner from "~/components/layout/beta-banner";
import MissionCtaPanel from "~/components/mission-detail/cta-panel";
import MissionDescriptionCard from "~/components/mission-detail/description-card";
import MissionHeroCard from "~/components/mission-detail/hero-card";
import MissionLocationCard from "~/components/mission-detail/location-card";
import SimilarMissions from "~/components/mission-detail/similar-missions";
import GradientBg from "~/components/ui/gradient-bg";
import Highlight from "~/components/ui/highlight";
import { browseMissions, fetchMissionDetail } from "~/services/mission-browse";
import { setQuizSessionId } from "~/services/tracking";
import { trackCtaClicked, trackMissionClickedFromDetail, trackMissionDetailViewed } from "~/services/tracking/events";
import type { LandingName, MissionDetailNavState } from "~/services/tracking/types";
import { resolveMissionDetailEntrySource } from "~/services/tracking/utils";
import { buildMissionApplicationHref, formatDeadline } from "~/utils/mission";
import { pageMeta } from "~/utils/seo";

export default function MissionDetailPage() {
  const { missionId, userScoringId } = useParams<{ missionId: string; userScoringId?: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const addressId = searchParams.get("addressId");
  const [mission, setMission] = useState<MissionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [otherMissions, setOtherMissions] = useState<MissionBrowse[]>([]);
  const viewedFiredRef = useRef<string | null>(null);
  const navState = location.state as MissionDetailNavState | null;
  // Fiche ouverte depuis une landing (ex. recherche « Trouve ta caserne ») : la landing d'origine, pour le carrousel du bas.
  const fromLanding = !userScoringId && navState?.backTo && navState.entrySource.startsWith("landing_") ? (navState.entrySource as LandingName) : null;

  useEffect(() => {
    if (!missionId) return;
    setLoading(true);
    fetchMissionDetail(missionId, addressId)
      .then(setMission)
      .catch(() => setError("Impossible de charger cette mission."))
      .finally(() => setLoading(false));
  }, [missionId, addressId]);

  // Carrousel « Il y a plein d'autres façons d'aider » : 10 missions d'une page tirée au hasard parmi les 10 premières.
  useEffect(() => {
    if (!fromLanding || !missionId) return;
    browseMissions({ pageSize: 10, page: Math.ceil(Math.random() * 10) })
      .then(({ data }) => setOtherMissions(data.filter((other) => other.id !== missionId)))
      .catch(() => setOtherMissions([]));
  }, [fromLanding, missionId]);

  // Fiche issue d'un résultat (/results/:userScoringId/missions/:id) : le userScoringId de l'URL est
  // la clé de session quiz → on l'enregistre comme super property (quiz_session_id) pour tous les
  // évènements de cette page (mission_detail.viewed, mission.clicked des missions similaires, ...).
  useEffect(() => {
    if (userScoringId) setQuizSessionId(userScoringId);
  }, [userScoringId]);

  // RGAA 8.5/8.6 : la mission est chargée côté client, meta() ne peut donner qu'un titre générique.
  // On le remplace par le titre de la mission dès qu'elle est disponible.
  useEffect(() => {
    if (mission?.title) document.title = `${mission.title} | Trouve ta mission`;
  }, [mission]);

  // mission_detail.viewed : une fois la fiche chargée, émis une seule fois par mission.
  useEffect(() => {
    if (!mission || !missionId || viewedFiredRef.current === missionId) return;
    viewedFiredRef.current = missionId;
    trackMissionDetailViewed({
      missionId,
      publisherId: mission.publisherId ?? "",
      publisherName: mission.publisherName ?? "",
      entrySource: resolveMissionDetailEntrySource(navState?.entrySource),
      rank: navState?.rank ?? null,
    });
  }, [mission, missionId, navState]);

  // Hors parcours résultats, on revient sur la page d'où vient la carte (landing) plutôt que sur l'accueil.
  const backPath = userScoringId ? `/results/${userScoringId}` : (navState?.backTo ?? "/");
  const backLabel = userScoringId ? "Retour aux résultats" : navState?.backTo ? "Retour" : "Accueil";
  const deadlineLabel = mission ? formatDeadline(mission.endAt) : null;
  const applicationHref = mission ? buildMissionApplicationHref(mission.applicationUrl, userScoringId) : "";

  if (loading) {
    return (
      <GradientBg>
        <main id="contenu" tabIndex={-1} className="mx-auto max-w-7xl px-5 py-10 md:px-6">
          <Link to={backPath} className="fr-btn fr-btn--tertiary-no-outline fr-icon-arrow-left-line fr-btn--icon-left mb-8">
            {backLabel}
          </Link>
          <p role="status" className="text-mention-grey text-sm">
            Chargement…
          </p>
        </main>
      </GradientBg>
    );
  }

  if (error || !mission) {
    return (
      <GradientBg>
        <main id="contenu" tabIndex={-1} className="mx-auto max-w-7xl px-5 py-10 md:px-6">
          <Link to={backPath} className="fr-btn fr-btn--tertiary-no-outline fr-icon-arrow-left-line fr-btn--icon-left mb-8">
            {backLabel}
          </Link>
          <div role="alert" className="fr-alert fr-alert--error">
            <p>{error ?? "Mission introuvable."}</p>
          </div>
        </main>
      </GradientBg>
    );
  }

  return (
    <>
      {/* Fiche ouverte depuis les résultats : même bandeau que la page de résultats (source=results). */}
      {userScoringId && <BetaBanner source="results" session={userScoringId} />}
      <main id="contenu" tabIndex={-1}>
        <GradientBg className="bg-size-[100%_680px] min-h-screen">
          {mission.photo && (
            <div className="h-54 w-full overflow-hidden md:hidden">
              <img src={mission.photo} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <div className="bg-background px-3 pt-2 md:hidden">
            <Link to={backPath} className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-arrow-left-line fr-btn--icon-left">
              {backLabel}
            </Link>
          </div>

          <div className={`mx-auto max-w-7xl ${userScoringId ? "pb-6" : "pb-28"} md:pt-6 md:px-6 md:py-10 bg-beige-gris-galet-975 md:bg-transparent`}>
            <Link to={backPath} className="fr-btn fr-btn--tertiary-no-outline fr-icon-arrow-left-line fr-btn--icon-left mb-6 hidden! md:inline-flex!">
              {backLabel}
            </Link>
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              <div className="flex min-w-0 flex-1 flex-col gap-0! md:gap-6!">
                <MissionHeroCard mission={mission} />
                {mission.location && <MissionLocationCard location={mission.location} />}
                <div className="md:hidden">
                  <MissionCtaPanel mission={mission} userScoringId={userScoringId} />
                </div>
                <MissionDescriptionCard mission={mission} />
              </div>

              <aside className="hidden w-[384px] flex-none md:block">
                <div className="sticky top-4 flex flex-col">
                  {mission.photo && (
                    <div className="h-54 w-full overflow-hidden">
                      <img src={mission.photo} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <MissionCtaPanel mission={mission} userScoringId={userScoringId} />
                </div>
              </aside>
            </div>
          </div>
        </GradientBg>

        {userScoringId && <SimilarMissions userScoringId={userScoringId} currentMissionId={mission.id} />}

        {fromLanding && navState?.backTo && otherMissions.length > 0 && (
          <div className="pb-28 md:pb-16">
            <Missions
              missions={otherMissions}
              title={
                <>
                  Il y a plein d’autres <Highlight className="bg-[#9ef9be] dark:bg-transparent">façons d’aider</Highlight>
                </>
              }
              description="Accompagner une personne en difficulté, protéger la nature, organiser des événements, aider des personnes isolées, s’engager pour son pays… Trouve la mission d’engagement qui te correspond !"
              cta={{
                to: "/quiz/age",
                label: "Trouve ta mission",
                onClick: () =>
                  trackCtaClicked({ pageName: fromLanding, ctaSection: "mission_detail", ctaLabel: "Trouve ta mission", ctaDestination: "quiz", destinationPath: "/quiz/age" }),
              }}
              landing={fromLanding}
              backTo={navState.backTo}
              className="bg-brown-cafe-creme-975"
            />
          </div>
        )}

        <div className="fixed right-0 bottom-0 left-0 z-10 border-t border-border-default-grey bg-background px-5 py-4 md:hidden">
          <a
            href={applicationHref}
            target="_blank"
            rel="noopener noreferrer"
            title="Découvrir la mission - nouvelle fenêtre"
            className="fr-btn w-full! justify-center!"
            onClick={() => trackMissionClickedFromDetail(mission)}
          >
            Découvrir la mission
          </a>
          {deadlineLabel && <p className="text-mention-grey text-sm! md:hidden text-center! mt-4! mb-0!">{deadlineLabel}</p>}
        </div>
      </main>
    </>
  );
}
