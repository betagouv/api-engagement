import type { MissionDetailPayload } from "@engagement/dto";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";

import MissionCtaPanel from "~/components/mission-detail/cta-panel";
import MissionDescriptionCard from "~/components/mission-detail/description-card";
import MissionHeroCard from "~/components/mission-detail/hero-card";
import MissionLocationCard from "~/components/mission-detail/location-card";
import SimilarMissions from "~/components/mission-detail/similar-missions";
import { fetchMissionDetail } from "~/services/mission-browse";

export default function MissionDetailPage() {
  const { missionId, userScoringId } = useParams<{ missionId: string; userScoringId?: string }>();
  const [mission, setMission] = useState<MissionDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!missionId) return;
    setLoading(true);
    fetchMissionDetail(missionId)
      .then(setMission)
      .catch(() => setError("Impossible de charger cette mission."))
      .finally(() => setLoading(false));
  }, [missionId]);

  const backPath = userScoringId ? `/results/${userScoringId}` : "/";
  const backLabel = userScoringId ? "Retour aux résultats" : "Accueil";

  // ── Loading / error ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen fr-background-alt--grey px-5 py-10 md:px-6">
        <Link to={backPath} className="fr-btn fr-btn--tertiary-no-outline fr-icon-arrow-left-line fr-btn--icon-left mb-8">
          {backLabel}
        </Link>
        <p className="text-sm text-mention-grey">Chargement…</p>
      </main>
    );
  }

  if (error || !mission) {
    return (
      <main className="min-h-screen fr-background-alt--grey px-5 py-10 md:px-6">
        <Link to={backPath} className="fr-btn fr-btn--tertiary-no-outline fr-icon-arrow-left-line fr-btn--icon-left mb-8">
          {backLabel}
        </Link>
        <div className="fr-alert fr-alert--error">
          <p>{error ?? "Mission introuvable."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen fr-background-alt--grey">
      <div className="bg-white px-5 py-4 md:px-6">
        <Link to={backPath} className="fr-btn fr-btn--tertiary-no-outline fr-icon-arrow-left-line fr-btn--icon-left">
          {backLabel}
        </Link>
      </div>

      {mission.photo && (
        <div className="h-[216px] w-full overflow-hidden md:hidden">
          <img src={mission.photo} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-start">
        <div className="flex flex-1 flex-col gap-4 p-5 md:gap-5 md:p-8 md:pr-10">
          <MissionHeroCard mission={mission} />
          {mission.location && <MissionLocationCard location={mission.location} />}
          <div className="md:hidden">
            <MissionCtaPanel mission={mission} />
          </div>
          <MissionDescriptionCard mission={mission} />
        </div>

        <div className="hidden w-[400px] flex-none p-8 pl-0 md:block">
          {mission.photo && (
            <div className="fr-card fr-card--no-arrow fr-mb-3w h-[216px] overflow-hidden">
              <img src={mission.photo} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <MissionCtaPanel mission={mission} className="sticky top-4" />
        </div>
      </div>

      {userScoringId && <SimilarMissions userScoringId={userScoringId} currentMissionId={mission.id} />}

      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-[#DDD] bg-white px-5 py-4 md:hidden">
        <a href={mission.applicationUrl} target="_blank" rel="noopener noreferrer" className="fr-btn w-full! justify-center!">
          Postuler
        </a>
      </div>
    </main>
  );
}
