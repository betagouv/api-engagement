import type { MissionDetailResponse } from "@engagement/dto";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";

export async function clientLoader({ params }: { params: { userScoringId?: string } }) {
  return { backHref: params.userScoringId ? `/results/${params.userScoringId}` : "/missions" };
}

import MissionCtaPanel from "~/components/mission-detail/cta-panel";
import MissionDescriptionCard from "~/components/mission-detail/description-card";
import MissionHeroCard from "~/components/mission-detail/hero-card";
import MissionLocationCard from "~/components/mission-detail/location-card";
import SimilarMissions from "~/components/mission-detail/similar-missions";
import GradientBg from "~/components/ui/gradient-bg";
import { fetchMissionDetail } from "~/services/mission-browse";

export default function MissionDetailPage() {
  const { missionId, userScoringId } = useParams<{ missionId: string; userScoringId?: string }>();
  const [searchParams] = useSearchParams();
  const addressId = searchParams.get("addressId");
  const [mission, setMission] = useState<MissionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!missionId) return;
    setLoading(true);
    fetchMissionDetail(missionId, addressId)
      .then(setMission)
      .catch(() => setError("Impossible de charger cette mission."))
      .finally(() => setLoading(false));
  }, [missionId, addressId]);

  const backPath = userScoringId ? `/results/${userScoringId}` : "/";
  const backLabel = userScoringId ? "Retour aux résultats" : "Accueil";

  if (loading) {
    return (
      <GradientBg>
        <main className="mx-auto max-w-[1200px] px-5 py-10 md:px-6">
          <Link to={backPath} className="fr-btn fr-btn--tertiary-no-outline fr-icon-arrow-left-line fr-btn--icon-left mb-8">
            {backLabel}
          </Link>
          <p className="text-mention-grey text-sm">Chargement…</p>
        </main>
      </GradientBg>
    );
  }

  if (error || !mission) {
    return (
      <GradientBg>
        <main className="mx-auto max-w-[1200px] px-5 py-10 md:px-6">
          <Link to={backPath} className="fr-btn fr-btn--tertiary-no-outline fr-icon-arrow-left-line fr-btn--icon-left mb-8">
            {backLabel}
          </Link>
          <div className="fr-alert fr-alert--error">
            <p>{error ?? "Mission introuvable."}</p>
          </div>
        </main>
      </GradientBg>
    );
  }

  return (
    <>
      <GradientBg>
        <main className="min-h-screen">
          {mission.photo && (
            <div className="h-[216px] w-full overflow-hidden md:hidden">
              <img src={mission.photo} alt="" className="h-full w-full object-cover" />
            </div>
          )}

          <div className="mx-auto max-w-[1200px] px-5 py-6 md:px-6 md:py-10">
            <Link to={backPath} className="fr-btn fr-btn--tertiary-no-outline fr-icon-arrow-left-line fr-btn--icon-left mb-6">
              {backLabel}
            </Link>
            <div className="flex flex-col gap-6 md:flex-row md:items-start">
              <div className="flex min-w-0 flex-1 flex-col gap-6">
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
                    <div className="h-[216px] w-full overflow-hidden">
                      <img src={mission.photo} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <MissionCtaPanel mission={mission} userScoringId={userScoringId} />
                </div>
              </aside>
            </div>
          </div>
        </main>
      </GradientBg>

      {userScoringId && <SimilarMissions userScoringId={userScoringId} currentMissionId={mission.id} />}

      <div className="fixed right-0 bottom-0 left-0 z-10 border-t border-[#DDD] bg-white px-5 py-4 md:hidden">
        <a href={mission.applicationUrl} target="_blank" rel="noopener noreferrer" className="fr-btn w-full! justify-center!">
          Découvrir la mission
        </a>
      </div>
    </>
  );
}
