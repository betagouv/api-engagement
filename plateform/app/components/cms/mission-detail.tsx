import type { MissionDetailResponse } from "@engagement/dto";
import { useEffect } from "react";
import { Link } from "react-router";

import MissionCtaPanel from "~/components/mission-detail/cta-panel";
import MissionDescriptionCard from "~/components/mission-detail/description-card";
import MissionHeroCard from "~/components/mission-detail/hero-card";
import MissionLocationCard from "~/components/mission-detail/location-card";
import { trackMissionClickedFromDetail, trackMissionDetailViewed } from "~/services/tracking/events";
import type { LandingName } from "~/services/tracking/types";

// Fiche d'une mission de l'API placée dans une page du CMS (ex. : suite d'une landing) : mêmes cartes que la fiche
// mission de la plateforme (routes/mission-detail.tsx), avec le bandeau crème des landings.
export default function MissionDetail({ mission, backUrl, landing }: { mission: MissionDetailResponse; backUrl: string | null; landing: LandingName }) {
  useEffect(() => {
    trackMissionDetailViewed({
      missionId: mission.id,
      publisherId: mission.publisherId ?? "",
      publisherName: mission.publisherName ?? "",
      entrySource: landing,
      rank: null,
    });
  }, [mission, landing]);

  const photo = mission.photo && <img src={mission.photo} alt="" className="h-full w-full object-cover" />;

  return (
    <div className="relative pb-28 md:pb-0">
      <div aria-hidden="true" className="bg-brown-cafe-creme-975 absolute inset-x-0 top-0 h-109 max-md:hidden" />

      {photo && <div className="h-54 w-full overflow-hidden md:hidden">{photo}</div>}

      <div className="relative mx-auto max-w-7xl md:px-6 md:pt-15">
        {backUrl && (
          <Link to={backUrl} className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-arrow-left-line fr-btn--icon-left mx-3! mt-2! md:mx-0! md:mt-0! md:mb-6!">
            Retour
          </Link>
        )}

        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-0! md:gap-6!">
            <MissionHeroCard mission={mission} />
            {mission.location && <MissionLocationCard location={mission.location} />}
            <div className="md:hidden">
              <MissionCtaPanel mission={mission} />
            </div>
            <MissionDescriptionCard mission={mission} />
          </div>

          <aside className="hidden w-96 flex-none md:block">
            <div className="sticky top-4 flex flex-col">
              {photo && <div className="h-54 w-full overflow-hidden">{photo}</div>}
              <MissionCtaPanel mission={mission} />
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile : le bouton de candidature vit dans une barre fixe en bas d'écran, comme sur la fiche mission. */}
      <div className="border-border-default-grey bg-background fixed right-0 bottom-0 left-0 z-10 border-t px-5 py-4 md:hidden">
        <a
          href={mission.applicationUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Découvrir la mission - nouvelle fenêtre"
          className="fr-btn w-full! justify-center!"
          onClick={() => trackMissionClickedFromDetail(mission)}
        >
          Découvrir la mission
        </a>
      </div>
    </div>
  );
}
